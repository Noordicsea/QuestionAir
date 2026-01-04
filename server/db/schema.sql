-- Questionair Database Schema
-- SQLite with WAL mode for better concurrency

-- Enable WAL mode (run separately)
-- PRAGMA journal_mode=WAL;

-- Users table (only two users)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    heavy_mode_enabled INTEGER DEFAULT 0,
    notifications_enabled INTEGER DEFAULT 1,
    quiet_hours_start TEXT,  -- e.g., "22:00"
    quiet_hours_end TEXT,    -- e.g., "08:00"
    default_depth TEXT DEFAULT 'medium' CHECK(default_depth IN ('quick', 'medium', 'deep')),
    quick_question_max_length INTEGER DEFAULT 280,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    author_user_id TEXT NOT NULL REFERENCES users(id),
    target_user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT,
    body TEXT NOT NULL,
    depth TEXT DEFAULT 'medium' CHECK(depth IN ('quick', 'medium', 'deep')),
    is_heavy INTEGER DEFAULT 0,
    cooldown_until TEXT,
    cooldown_reason TEXT,
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'holding', 'declined', 'active')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    CHECK(author_user_id != target_user_id)
);

-- Question versions for edit history
CREATE TABLE IF NOT EXISTS question_versions (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    title TEXT,
    body TEXT NOT NULL,
    edited_by_user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Responses table
CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    author_user_id TEXT NOT NULL REFERENCES users(id),
    response_type TEXT NOT NULL CHECK(response_type IN ('quick_reaction', 'text_short', 'text_long', 'template', 'voice')),
    body_text TEXT,
    template_name TEXT,
    template_data TEXT,  -- JSON for template fields
    voice_file_path TEXT,
    voice_duration_seconds INTEGER,
    is_draft INTEGER DEFAULT 0,
    answer_budget_minutes INTEGER,  -- 5, 10, 15 minute budgets
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Response versions for edit history
CREATE TABLE IF NOT EXISTS response_versions (
    id TEXT PRIMARY KEY,
    response_id TEXT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    body_text TEXT,
    template_data TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Quick reactions (predefined chips)
CREATE TABLE IF NOT EXISTS quick_reactions (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    emoji TEXT,
    sort_order INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 1,
    created_by_user_id TEXT REFERENCES users(id)
);

-- Response templates
CREATE TABLE IF NOT EXISTS response_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    fields TEXT NOT NULL,  -- JSON array of field definitions
    is_system INTEGER DEFAULT 1,
    is_enabled INTEGER DEFAULT 1,
    created_by_user_id TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Swipe queue per user
CREATE TABLE IF NOT EXISTS swipe_queue (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, question_id)
);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT
);

-- Event log for notifications and audit
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL,
    payload TEXT,  -- JSON
    seen_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Sessions table for auth
CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expired TEXT NOT NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_questions_target ON questions(target_user_id, status);
CREATE INDEX IF NOT EXISTS idx_questions_author ON questions(author_user_id);
CREATE INDEX IF NOT EXISTS idx_questions_updated ON questions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_question ON responses(question_id);
CREATE INDEX IF NOT EXISTS idx_events_user_unseen ON events(user_id, seen_at);
CREATE INDEX IF NOT EXISTS idx_swipe_queue_user ON swipe_queue(user_id, position);
CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);

-- Insert default quick reactions
INSERT OR IGNORE INTO quick_reactions (id, label, emoji, sort_order) VALUES
    ('qr_short', 'Short answer', NULL, 1),
    ('qr_dont_know', 'I don''t know yet', NULL, 2),
    ('qr_not_ready', 'Not ready', NULL, 3),
    ('qr_talk_live', 'Let''s talk live', NULL, 4),
    ('qr_voice', 'Voice note coming', NULL, 5),
    ('qr_cooldown', 'Need cooldown', NULL, 6),
    ('qr_later', 'I can answer later', NULL, 7);

-- Insert default response templates
INSERT OR IGNORE INTO response_templates (id, name, description, fields) VALUES
    ('tpl_three_part', 'Three-Part Response', 'Structure your thoughts clearly', 
     '[{"key":"heard","label":"What I heard you asking","type":"textarea"},{"key":"answer","label":"My answer right now","type":"textarea"},{"key":"need","label":"What I need to feel okay continuing","type":"textarea"}]'),
    
    ('tpl_nvc', 'NVC-lite', 'Nonviolent communication framework',
     '[{"key":"observation","label":"Observation","type":"textarea"},{"key":"feeling","label":"Feeling","type":"textarea"},{"key":"need","label":"Need","type":"textarea"},{"key":"request","label":"Request","type":"textarea"}]'),
    
    ('tpl_boundary', 'Boundary Response', 'Set clear boundaries with care',
     '[{"key":"can","label":"I can answer this part","type":"textarea"},{"key":"cant","label":"I can''t answer this part","type":"textarea"},{"key":"help","label":"What would help is","type":"textarea"}]'),
    
    ('tpl_talk_live', 'Talk Live Request', 'Propose a live conversation',
     '[{"key":"reason","label":"I think this is better live because","type":"textarea"},{"key":"time","label":"Earliest time that works for me","type":"text"},{"key":"topics","label":"What I want to cover","type":"textarea"}]');

