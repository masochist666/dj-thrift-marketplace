-- Add triggers for business logic and data integrity

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON tracks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger function to ensure royalties sum <= 100%
CREATE OR REPLACE FUNCTION check_royalty_sum()
RETURNS TRIGGER AS $$
DECLARE
    total numeric;
BEGIN
    SELECT COALESCE(SUM(share_percent), 0) INTO total
    FROM royalties
    WHERE track_file_id = NEW.track_file_id;
    
    IF (TG_OP = 'INSERT') THEN
        IF (total + NEW.share_percent) > 100 THEN
            RAISE EXCEPTION 'Total royalties would exceed 100%% for track_file %', NEW.track_file_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        SELECT COALESCE(SUM(share_percent), 0) - COALESCE(OLD.share_percent, 0) INTO total
        FROM royalties
        WHERE track_file_id = NEW.track_file_id;
        IF (total + NEW.share_percent) > 100 THEN
            RAISE EXCEPTION 'Total royalties would exceed 100%% for track_file %', NEW.track_file_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_royalties_sum BEFORE INSERT OR UPDATE ON royalties
    FOR EACH ROW EXECUTE FUNCTION check_royalty_sum();

-- Trigger function to prevent locking non-transferable files in trades
CREATE OR REPLACE FUNCTION prevent_nontransferable_lock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.track_file_id IS NOT NULL THEN
        IF (SELECT transferable FROM track_files WHERE id = NEW.track_file_id) = false THEN
            RAISE EXCEPTION 'Track file % is non-transferable', NEW.track_file_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_nontransferable_trade_items BEFORE INSERT OR UPDATE ON trade_items
    FOR EACH ROW EXECUTE FUNCTION prevent_nontransferable_lock();

-- Trigger function to automatically create profile when user is created
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id, display_name)
    VALUES (NEW.id, split_part(NEW.email, '@', 1));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_profile_on_user_insert AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Trigger function to update user reputation based on trades
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
DECLARE
    proposer_reputation numeric;
    receiver_reputation numeric;
BEGIN
    -- Get current reputations
    SELECT reputation INTO proposer_reputation FROM profiles WHERE user_id = NEW.proposer_id;
    SELECT reputation INTO receiver_reputation FROM profiles WHERE user_id = NEW.receiver_id;
    
    -- Update reputations based on trade completion
    IF NEW.status = 'completed' THEN
        -- Increase reputation for successful trade
        UPDATE profiles SET reputation = reputation + 1 WHERE user_id = NEW.proposer_id;
        UPDATE profiles SET reputation = reputation + 1 WHERE user_id = NEW.receiver_id;
    ELSIF NEW.status = 'declined' THEN
        -- Slight decrease for declined trades (spam prevention)
        UPDATE profiles SET reputation = GREATEST(reputation - 0.1, 0) WHERE user_id = NEW.proposer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reputation_on_trade_update AFTER UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION update_user_reputation();

-- Trigger function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (actor_id, action, target, details)
    VALUES (
        COALESCE(NEW.owner_id, NEW.buyer_id, NEW.proposer_id, NEW.receiver_id),
        TG_OP,
        to_jsonb(NEW),
        jsonb_build_object('table', TG_TABLE_NAME, 'timestamp', now())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit logging to sensitive tables
CREATE TRIGGER audit_tracks AFTER INSERT OR UPDATE OR DELETE ON tracks
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_purchases AFTER INSERT OR UPDATE OR DELETE ON purchases
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_trades AFTER INSERT OR UPDATE OR DELETE ON trades
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

