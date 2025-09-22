-- Add indexes for better performance

-- Users and profiles indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Tracks indexes
CREATE INDEX idx_tracks_owner ON tracks(owner_id);
CREATE INDEX idx_tracks_visibility ON tracks(visibility);
CREATE INDEX idx_tracks_published ON tracks(is_published);
CREATE INDEX idx_tracks_genre ON tracks(main_genre);
CREATE INDEX idx_tracks_created_at ON tracks(created_at);

-- Track files indexes
CREATE INDEX idx_track_files_owner ON track_files(owner_id);
CREATE INDEX idx_track_files_track ON track_files(track_id);
CREATE INDEX idx_track_files_price ON track_files(price_cents);
CREATE INDEX idx_track_files_type ON track_files(file_type);
CREATE INDEX idx_track_files_transferable ON track_files(transferable);

-- Track metadata indexes
CREATE INDEX idx_metadata_bpm ON track_metadata(bpm);
CREATE INDEX idx_metadata_key ON track_metadata(musical_key);
CREATE INDEX idx_metadata_bpm_key ON track_metadata(bpm, musical_key);
CREATE INDEX idx_metadata_tags ON track_metadata USING GIN(tags);

-- Purchases indexes
CREATE INDEX idx_purchases_buyer ON purchases(buyer_id);
CREATE INDEX idx_purchases_track_file ON purchases(track_file_id);
CREATE INDEX idx_purchases_created_at ON purchases(created_at);

-- Trades indexes
CREATE INDEX idx_trades_proposer ON trades(proposer_id);
CREATE INDEX idx_trades_receiver ON trades(receiver_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_created_at ON trades(created_at);
CREATE INDEX idx_trades_expires_at ON trades(expires_at);

-- Trade items indexes
CREATE INDEX idx_trade_items_trade ON trade_items(trade_id);
CREATE INDEX idx_trade_items_offered_by ON trade_items(offered_by);
CREATE INDEX idx_trade_items_track_file ON trade_items(track_file_id);

-- Credits indexes
CREATE INDEX idx_credits_user ON credits_transactions(user_id);
CREATE INDEX idx_credits_created_at ON credits_transactions(created_at);

-- Access grants indexes
CREATE INDEX idx_access_grants_user ON access_grants(user_id);
CREATE INDEX idx_access_grants_track_file ON access_grants(track_file_id);
CREATE INDEX idx_access_grants_type ON access_grants(grant_type);

-- Groups indexes
CREATE INDEX idx_groups_owner ON groups(owner_id);
CREATE INDEX idx_groups_private ON groups(is_private);

-- Group members indexes
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_role ON group_members(role);

-- Messages indexes
CREATE INDEX idx_messages_group ON messages(group_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Follows indexes
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Playlists indexes
CREATE INDEX idx_playlists_user ON playlists(user_id);
CREATE INDEX idx_playlists_public ON playlists(is_public);

-- Playlist tracks indexes
CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_track_file ON playlist_tracks(track_file_id);
CREATE INDEX idx_playlist_tracks_position ON playlist_tracks(position);

