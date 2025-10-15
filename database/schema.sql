CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'staff')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE food_windows (
    id SERIAL PRIMARY KEY,
    available_bags INTEGER NOT NULL CHECK (available_bags >= 0),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_time > start_time)
);

CREATE TABLE citizens (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    food_window_id INTEGER NOT NULL REFERENCES food_windows(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    pickup_confirmed BOOLEAN DEFAULT false,
    UNIQUE(phone, food_window_id)
);

CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_window_id INTEGER NOT NULL REFERENCES food_windows(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_citizens_phone ON citizens(phone);
CREATE INDEX idx_citizens_food_window ON citizens(food_window_id);
CREATE INDEX idx_food_windows_active ON food_windows(is_active, start_time, end_time);
CREATE INDEX idx_qr_expires ON qr_codes(expires_at);
