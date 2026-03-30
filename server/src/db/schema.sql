-- ConnectX Database Schema

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(32)  UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(64),
    preferred_color VARCHAR(7)   DEFAULT '#FF6FAF',
    avatar_url      TEXT,
    rating          INTEGER      DEFAULT 1000,
    rating_deviation INTEGER     DEFAULT 350,
    games_played    INTEGER      DEFAULT 0,
    wins            INTEGER      DEFAULT 0,
    losses          INTEGER      DEFAULT 0,
    draws           INTEGER      DEFAULT 0,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_history (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode             VARCHAR(16) NOT NULL,
    connect_n        INTEGER     NOT NULL,
    player_count     INTEGER     NOT NULL,
    winner_id        UUID REFERENCES users(id),
    is_draw          BOOLEAN     DEFAULT FALSE,
    rounds_played    INTEGER,
    duration_seconds INTEGER,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_players (
    match_id      UUID    REFERENCES match_history(id) ON DELETE CASCADE,
    user_id       UUID    REFERENCES users(id) ON DELETE CASCADE,
    player_index  INTEGER NOT NULL,
    is_bot        BOOLEAN DEFAULT FALSE,
    score         INTEGER DEFAULT 0,
    rating_before INTEGER,
    rating_after  INTEGER,
    PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_id UUID REFERENCES users(id) ON DELETE SET NULL,
    match_id    UUID REFERENCES match_history(id) ON DELETE SET NULL,
    reason      VARCHAR(255) NOT NULL,
    details     TEXT,
    status      VARCHAR(16)  DEFAULT 'pending',
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocked_users (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email          ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username        ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_rating          ON users (rating DESC);
CREATE INDEX IF NOT EXISTS idx_match_history_created ON match_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_players_user    ON match_players (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status        ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_reported      ON reports (reported_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users (blocked_id);
