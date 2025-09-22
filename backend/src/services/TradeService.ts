import { DatabaseService } from './DatabaseService';
import { WebSocketService } from './WebSocketService';
import { logger } from '../utils/logger';

export interface Trade {
  id: string;
  proposer_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  expires_at?: string;
  updated_at: string;
}

export interface TradeItem {
  id: string;
  trade_id: string;
  offered_by: string;
  track_file_id?: string;
  credits_offered: number;
  cash_offered_cents: number;
  note?: string;
  created_at: string;
}

export interface CreateTradeRequest {
  receiver_id: string;
  items: Array<{
    track_file_id?: string;
    credits_offered?: number;
    cash_offered_cents?: number;
    note?: string;
  }>;
  requested_items: Array<{
    track_file_id: string;
  }>;
  expires_in_seconds?: number;
}

export class TradeService {
  constructor(
    private db: DatabaseService,
    private wsService: WebSocketService
  ) {}

  async createTrade(proposerId: string, tradeData: CreateTradeRequest): Promise<Trade> {
    try {
      // Validate that all offered track files belong to the proposer
      if (tradeData.items.some(item => item.track_file_id)) {
        const offeredTrackFiles = tradeData.items
          .filter(item => item.track_file_id)
          .map(item => item.track_file_id!);

        const ownershipCheck = await this.db.query(`
          SELECT id FROM track_files 
          WHERE id = ANY($1) AND owner_id = $2 AND transferable = true
        `, [offeredTrackFiles, proposerId]);

        if (ownershipCheck.length !== offeredTrackFiles.length) {
          throw new Error('Some offered tracks do not belong to you or are not transferable');
        }
      }

      // Validate that all requested track files exist and are transferable
      if (tradeData.requested_items.length > 0) {
        const requestedTrackFiles = tradeData.requested_items.map(item => item.track_file_id);

        const availabilityCheck = await this.db.query(`
          SELECT id FROM track_files 
          WHERE id = ANY($1) AND transferable = true AND locked_by_trade IS NULL
        `, [requestedTrackFiles]);

        if (availabilityCheck.length !== requestedTrackFiles.length) {
          throw new Error('Some requested tracks are not available for trading');
        }
      }

      // Create trade
      const expiresAt = new Date(Date.now() + (tradeData.expires_in_seconds || 86400) * 1000);
      const trade = await this.db.create('trades', {
        proposer_id: proposerId,
        receiver_id: tradeData.receiver_id,
        status: 'pending',
        expires_at: expiresAt
      });

      // Create trade items for offered items
      for (const item of tradeData.items) {
        await this.db.create('trade_items', {
          trade_id: trade.id,
          offered_by: proposerId,
          track_file_id: item.track_file_id,
          credits_offered: item.credits_offered || 0,
          cash_offered_cents: item.cash_offered_cents || 0,
          note: item.note
        });
      }

      // Create trade items for requested items
      for (const item of tradeData.requested_items) {
        await this.db.create('trade_items', {
          trade_id: trade.id,
          offered_by: tradeData.receiver_id,
          track_file_id: item.track_file_id,
          credits_offered: 0,
          cash_offered_cents: 0,
          note: 'Requested item'
        });
      }

      // Notify receiver
      this.wsService.notifyUser(tradeData.receiver_id, {
        type: 'trade:created',
        trade_id: trade.id,
        proposer_id: proposerId,
        message: 'You have received a new trade proposal'
      });

      logger.info(`Trade created: ${trade.id} by ${proposerId} to ${tradeData.receiver_id}`);
      return trade;
    } catch (error) {
      logger.error('Create trade error:', error);
      throw error;
    }
  }

  async getTrade(tradeId: string, userId: string): Promise<{
    trade: Trade;
    items: TradeItem[];
    requested_items: TradeItem[];
    proposer_profile: any;
    receiver_profile: any;
  }> {
    try {
      const trade = await this.db.findById('trades', tradeId);
      if (!trade) {
        throw new Error('Trade not found');
      }

      // Check if user is involved in the trade
      if (trade.proposer_id !== userId && trade.receiver_id !== userId) {
        throw new Error('Access denied');
      }

      const items = await this.db.findMany('trade_items', { trade_id: tradeId });
      const proposerItems = items.filter(item => item.offered_by === trade.proposer_id);
      const requestedItems = items.filter(item => item.offered_by === trade.receiver_id);

      // Get profiles
      const proposerProfile = await this.db.query(`
        SELECT p.*, u.email FROM profiles p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.user_id = $1
      `, [trade.proposer_id]);

      const receiverProfile = await this.db.query(`
        SELECT p.*, u.email FROM profiles p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.user_id = $1
      `, [trade.receiver_id]);

      return {
        trade,
        items: proposerItems,
        requested_items: requestedItems,
        proposer_profile: proposerProfile[0],
        receiver_profile: receiverProfile[0]
      };
    } catch (error) {
      logger.error('Get trade error:', error);
      throw error;
    }
  }

  async respondToTrade(tradeId: string, userId: string, response: {
    action: 'accept' | 'decline' | 'counter';
    counter_items?: Array<{
      track_file_id?: string;
      credits_offered?: number;
      cash_offered_cents?: number;
      note?: string;
    }>;
  }): Promise<{ trade_id: string; status: string }> {
    try {
      const trade = await this.db.findById('trades', tradeId);
      if (!trade) {
        throw new Error('Trade not found');
      }

      if (trade.receiver_id !== userId) {
        throw new Error('Only the receiver can respond to a trade');
      }

      if (trade.status !== 'pending') {
        throw new Error('Trade is no longer pending');
      }

      if (response.action === 'accept') {
        await this.acceptTrade(tradeId);
      } else if (response.action === 'decline') {
        await this.db.update('trades', tradeId, { status: 'declined' });
      } else if (response.action === 'counter') {
        await this.handleCounterOffer(tradeId, userId, response.counter_items || []);
      }

      // Notify both parties
      this.wsService.notifyUser(trade.proposer_id, {
        type: 'trade:updated',
        trade_id: tradeId,
        status: response.action,
        message: `Trade ${response.action}ed`
      });

      this.wsService.notifyUser(trade.receiver_id, {
        type: 'trade:updated',
        trade_id: tradeId,
        status: response.action,
        message: `Trade ${response.action}ed`
      });

      logger.info(`Trade ${response.action}ed: ${tradeId} by ${userId}`);
      return { trade_id: tradeId, status: response.action };
    } catch (error) {
      logger.error('Respond to trade error:', error);
      throw error;
    }
  }

  private async acceptTrade(tradeId: string): Promise<void> {
    try {
      await this.db.transaction(async (trx) => {
        // Get trade details
        const trade = await trx('trades').where('id', tradeId).first();
        if (!trade) {
          throw new Error('Trade not found');
        }

        // Get all trade items
        const items = await trx('trade_items').where('trade_id', tradeId);

        // Lock track files
        const trackFileIds = items
          .filter(item => item.track_file_id)
          .map(item => item.track_file_id);

        if (trackFileIds.length > 0) {
          await trx('track_files')
            .whereIn('id', trackFileIds)
            .update({ locked_by_trade: tradeId });
        }

        // Process credits and cash transfers
        for (const item of items) {
          if (item.credits_offered > 0) {
            await this.transferCredits(trx, item.offered_by, trade.proposer_id, item.credits_offered, `Trade ${tradeId}`);
          }
          if (item.cash_offered_cents > 0) {
            // Handle cash transfer through payment service
            // This would integrate with Stripe
            logger.info(`Cash transfer needed: ${item.cash_offered_cents} cents from ${item.offered_by} to ${trade.proposer_id}`);
          }
        }

        // Create access grants
        await this.createAccessGrants(trx, tradeId, items);

        // Mark trade as completed
        await trx('trades').where('id', tradeId).update({ status: 'completed' });
      });

      logger.info(`Trade completed: ${tradeId}`);
    } catch (error) {
      logger.error('Accept trade error:', error);
      throw error;
    }
  }

  private async transferCredits(trx: any, fromUserId: string, toUserId: string, amount: number, reason: string): Promise<void> {
    // Get current balances
    const fromBalance = await this.getCreditsBalance(trx, fromUserId);
    const toBalance = await this.getCreditsBalance(trx, toUserId);

    if (fromBalance < amount) {
      throw new Error('Insufficient credits');
    }

    // Create transaction records
    await trx('credits_transactions').insert({
      user_id: fromUserId,
      delta: -amount,
      reason: reason,
      balance_after: fromBalance - amount
    });

    await trx('credits_transactions').insert({
      user_id: toUserId,
      delta: amount,
      reason: reason,
      balance_after: toBalance + amount
    });
  }

  private async getCreditsBalance(trx: any, userId: string): Promise<number> {
    const result = await trx('credits_transactions')
      .where('user_id', userId)
      .sum('delta as balance')
      .first();

    return result.balance || 0;
  }

  private async createAccessGrants(trx: any, tradeId: string, items: TradeItem[]): Promise<void> {
    for (const item of items) {
      if (item.track_file_id) {
        // Grant access to the new owner
        await trx('access_grants').insert({
          user_id: item.offered_by,
          track_file_id: item.track_file_id,
          grant_type: 'trade'
        });
      }
    }
  }

  private async handleCounterOffer(tradeId: string, userId: string, counterItems: Array<{
    track_file_id?: string;
    credits_offered?: number;
    cash_offered_cents?: number;
    note?: string;
  }>): Promise<void> {
    // For now, just add counter items as new trade items
    // In a more sophisticated system, this might create a new trade or update the existing one
    for (const item of counterItems) {
      await this.db.create('trade_items', {
        trade_id: tradeId,
        offered_by: userId,
        track_file_id: item.track_file_id,
        credits_offered: item.credits_offered || 0,
        cash_offered_cents: item.cash_offered_cents || 0,
        note: item.note || 'Counter offer'
      });
    }
  }

  async getUserTrades(userId: string, status?: string): Promise<Trade[]> {
    try {
      const conditions: any = {
        $or: [
          { proposer_id: userId },
          { receiver_id: userId }
        ]
      };

      if (status) {
        conditions.status = status;
      }

      return await this.db.findMany('trades', conditions, {
        orderBy: 'created_at',
        orderDirection: 'desc',
        limit: 50
      });
    } catch (error) {
      logger.error('Get user trades error:', error);
      throw error;
    }
  }

  async cancelTrade(tradeId: string, userId: string): Promise<boolean> {
    try {
      const trade = await this.db.findById('trades', tradeId);
      if (!trade) {
        throw new Error('Trade not found');
      }

      if (trade.proposer_id !== userId) {
        throw new Error('Only the proposer can cancel a trade');
      }

      if (trade.status !== 'pending') {
        throw new Error('Cannot cancel a trade that is not pending');
      }

      // Unlock any locked track files
      await this.db.query(`
        UPDATE track_files 
        SET locked_by_trade = NULL 
        WHERE locked_by_trade = $1
      `, [tradeId]);

      // Mark trade as cancelled
      const updated = await this.db.update('trades', tradeId, { status: 'cancelled' });

      // Notify receiver
      this.wsService.notifyUser(trade.receiver_id, {
        type: 'trade:updated',
        trade_id: tradeId,
        status: 'cancelled',
        message: 'Trade was cancelled'
      });

      logger.info(`Trade cancelled: ${tradeId} by ${userId}`);
      return !!updated;
    } catch (error) {
      logger.error('Cancel trade error:', error);
      throw error;
    }
  }

  async expireTrades(): Promise<number> {
    try {
      const expiredTrades = await this.db.query(`
        SELECT id FROM trades 
        WHERE status = 'pending' AND expires_at < now()
      `);

      let expiredCount = 0;
      for (const trade of expiredTrades) {
        // Unlock track files
        await this.db.query(`
          UPDATE track_files 
          SET locked_by_trade = NULL 
          WHERE locked_by_trade = $1
        `, [trade.id]);

        // Mark as cancelled
        await this.db.update('trades', trade.id, { status: 'cancelled' });
        expiredCount++;

        // Notify both parties
        this.wsService.notifyUser(trade.proposer_id, {
          type: 'trade:expired',
          trade_id: trade.id,
          message: 'Trade expired'
        });

        this.wsService.notifyUser(trade.receiver_id, {
          type: 'trade:expired',
          trade_id: trade.id,
          message: 'Trade expired'
        });
      }

      logger.info(`Expired ${expiredCount} trades`);
      return expiredCount;
    } catch (error) {
      logger.error('Expire trades error:', error);
      throw error;
    }
  }
}
