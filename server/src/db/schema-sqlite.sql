CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    username        TEXT UNIQUE NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    display_name    TEXT,
    preferred_color TEXT DEFAULT '#FF6FAF',
    avatar_url      TEXT,
    rating          INTEGER DEFAULT 1000,
    rating_deviation INTEGER DEFAULT 350,
    games_played    INTEGER DEFAULT 0,
    wins            INTEGER DEFAULT 0,
    losses          INTEGER DEFAULT 0,
    draws           INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS match_history (
    id               TEXT PRIMARY KEY,
    mode             TEXT NOT NULL,
    connect_n        INTEGER NOT NULL,
    player_count     INTEGER NOT NULL,
    winner_id        TEXT REFERENCES users(id),
    is_draw          INTEGER DEFAULT 0,
    rounds_played    INTEGER,
    duration_seconds INTEGER,
    created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS match_players (
    match_id      TEXT    REFERENCES match_history(id) ON DELETE CASCADE,
    user_id       TEXT    REFERENCES users(id) ON DELETE CASCADE,
    player_index  INTEGER NOT NULL,
    is_bot        INTEGER DEFAULT 0,
    score         INTEGER DEFAULT 0,
    rating_before INTEGER,
    rating_after  INTEGER,
    PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS reports (
    id          TEXT PRIMARY KEY,
    reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    reported_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    match_id    TEXT REFERENCES match_history(id) ON DELETE SET NULL,
    reason      TEXT NOT NULL,
    details     TEXT,
    status      TEXT DEFAULT 'pending',
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocked_users (
    blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
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

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      TEXT DEFAULT 'pending',
    created_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, friend_id),
    CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships (friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships (status);
