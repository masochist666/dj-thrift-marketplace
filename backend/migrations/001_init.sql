-- DJ Thrift Marketplace Database Schema
-- Initial migration with all core tables

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  password_hash text,
  role smallint NOT NULL DEFAULT 0, -- 0=user,1=artist,2=label,3=admin
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Profiles table
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  bio text,
  avatar_url text,
  location text,
  genres text[],
  reputation numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tracks table
CREATE TABLE tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES users(id) NOT NULL,
  title text NOT NULL,
  description text,
  main_genre text,
  visibility text NOT NULL DEFAULT 'private', -- public|private|trade_only|promo
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Track files table
CREATE TABLE track_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES users(id) NOT NULL,
  s3_key text NOT NULL,
  file_type text NOT NULL, -- wav|mp3|stem|preview
  sample_rate integer,
  channels smallint,
  duration_ms integer,
  file_size bigint,
  price_cents integer,
  currency text DEFAULT 'USD',
  is_preview boolean DEFAULT false,
  transferable boolean DEFAULT true,
  locked_by_trade uuid,
  created_at timestamptz DEFAULT now()
);

-- Track metadata table
CREATE TABLE track_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_file_id uuid UNIQUE REFERENCES track_files(id) ON DELETE CASCADE,
  bpm numeric,
  musical_key text,
  loudness_db numeric,
  waveform_s3 text,
  cue_points jsonb,
  tags text[],
  analyzed_at timestamptz DEFAULT now()
);

-- Licenses table
CREATE TABLE licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_file_id uuid UNIQUE REFERENCES track_files(id) ON DELETE CASCADE,
  license_type text NOT NULL, -- dj_play, remix_allowed, commercial, exclusive
  permissions jsonb NOT NULL, -- {"play":true,"remix":false,"resale":false}
  royalty_percent numeric DEFAULT 0,
  terms text,
  created_at timestamptz DEFAULT now()
);

-- Purchases table
CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES users(id) NOT NULL,
  track_file_id uuid REFERENCES track_files(id) NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  payment_id uuid,
  license_snapshot jsonb NOT NULL,
  delivered boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_payment_id text,
  status text NOT NULL,
  amount_cents integer,
  currency text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Trades table
CREATE TABLE trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id uuid REFERENCES users(id) NOT NULL,
  receiver_id uuid REFERENCES users(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|accepted|declined|completed|cancelled
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Trade items table
CREATE TABLE trade_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid REFERENCES trades(id) ON DELETE CASCADE,
  offered_by uuid REFERENCES users(id) NOT NULL,
  track_file_id uuid REFERENCES track_files(id),
  credits_offered integer DEFAULT 0,
  cash_offered_cents integer DEFAULT 0,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Credits transactions table
CREATE TABLE credits_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  delta integer NOT NULL,
  reason text,
  metadata jsonb,
  balance_after integer,
  created_at timestamptz DEFAULT now()
);

-- Royalties table
CREATE TABLE royalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_file_id uuid REFERENCES track_files(id),
  recipient_id uuid REFERENCES users(id),
  share_percent numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Access grants table
CREATE TABLE access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  track_file_id uuid REFERENCES track_files(id) NOT NULL,
  grant_type text NOT NULL, -- purchase|trade|promo
  granted_at timestamptz DEFAULT now()
);

-- Groups table
CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES users(id) NOT NULL,
  is_private boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Group members table
CREATE TABLE group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) NOT NULL,
  role text DEFAULT 'member', -- owner|admin|member
  joined_at timestamptz DEFAULT now()
);

-- Messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) NULL,
  sender_id uuid REFERENCES users(id) NOT NULL,
  receiver_id uuid REFERENCES users(id) NULL,
  content text,
  attachments jsonb,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  payload jsonb NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text,
  target jsonb,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Follows table
CREATE TABLE follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES users(id) NOT NULL,
  following_id uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Playlists table
CREATE TABLE playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Playlist tracks table
CREATE TABLE playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
  track_file_id uuid REFERENCES track_files(id) NOT NULL,
  position integer NOT NULL,
  added_at timestamptz DEFAULT now()
);
