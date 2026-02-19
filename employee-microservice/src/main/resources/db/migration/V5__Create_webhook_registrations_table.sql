-- Webhook registrations table
CREATE TABLE IF NOT EXISTS webhook_registrations (
    id BIGSERIAL PRIMARY KEY,
    callback_url VARCHAR(500) NOT NULL,
    event_types VARCHAR(500) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    failure_count INTEGER NOT NULL DEFAULT 0,
    max_failures INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);