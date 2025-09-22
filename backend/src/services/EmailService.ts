import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendWelcomeEmail(email: string, displayName: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@djthrift.com',
        to: email,
        subject: 'Welcome to DJ Thrift!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8b5cf6;">Welcome to DJ Thrift, ${displayName}!</h1>
            <p>You're now part of the first peer-to-peer DJ marketplace. Start trading tracks like vinyl records!</p>
            <div style="background: #1f2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #fff; margin-top: 0;">Get Started:</h3>
              <ul style="color: #d1d5db;">
                <li>Upload your first track</li>
                <li>Browse the marketplace</li>
                <li>Join trading groups</li>
                <li>Start building your reputation</li>
              </ul>
            </div>
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        `
      });
      logger.info(`Welcome email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
    }
  }

  async sendTradeNotification(email: string, proposerName: string, trackTitle: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@djthrift.com',
        to: email,
        subject: `New Trade Proposal from ${proposerName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8b5cf6;">New Trade Proposal!</h1>
            <p><strong>${proposerName}</strong> wants to trade for your track: <strong>${trackTitle}</strong></p>
            <div style="background: #1f2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #d1d5db; margin: 0;">Check your dashboard to review and respond to this trade proposal.</p>
            </div>
            <a href="${process.env.FRONTEND_URL}/trades" 
               style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Trade
            </a>
          </div>
        `
      });
      logger.info(`Trade notification sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send trade notification:', error);
    }
  }

  async sendPurchaseNotification(email: string, trackTitle: string, amount: number) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@djthrift.com',
        to: email,
        subject: `Track Sold: ${trackTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8b5cf6;">Track Sold! 🎉</h1>
            <p>Your track <strong>${trackTitle}</strong> has been sold for <strong>$${(amount / 100).toFixed(2)}</strong></p>
            <div style="background: #1f2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #d1d5db; margin: 0;">The payment has been processed and will be available in your account shortly.</p>
            </div>
            <a href="${process.env.FRONTEND_URL}/dashboard/sales" 
               style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Sales
            </a>
          </div>
        `
      });
      logger.info(`Purchase notification sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send purchase notification:', error);
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@djthrift.com',
        to: email,
        subject: 'Reset Your Password - DJ Thrift',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8b5cf6;">Password Reset Request</h1>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <div style="background: #1f2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #d1d5db; margin: 0;">This link will expire in 1 hour for security reasons.</p>
            </div>
            <a href="${resetUrl}" 
               style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        `
      });
      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
    }
  }

  async sendGroupInvitation(email: string, groupName: string, inviterName: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@djthrift.com',
        to: email,
        subject: `Invitation to join ${groupName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8b5cf6;">Group Invitation</h1>
            <p><strong>${inviterName}</strong> has invited you to join the group <strong>${groupName}</strong></p>
            <div style="background: #1f2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #d1d5db; margin: 0;">Join this group to start trading tracks with other DJs and discover new music!</p>
            </div>
            <a href="${process.env.FRONTEND_URL}/groups" 
               style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Groups
            </a>
          </div>
        `
      });
      logger.info(`Group invitation sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send group invitation:', error);
    }
  }
}
