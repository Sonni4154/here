
-- TimeSync Pro Database Initialization

-- Create additional extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
DO $$
BEGIN
    -- Users table indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
        CREATE INDEX idx_users_email ON users(email);
    END IF;

    -- Customers table indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_user_id') THEN
        CREATE INDEX idx_customers_user_id ON customers(user_id);
    END IF;

    -- Time entries indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_time_entries_user_id') THEN
        CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_time_entries_customer_id') THEN
        CREATE INDEX idx_time_entries_customer_id ON time_entries(customer_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_time_entries_date') THEN
        CREATE INDEX idx_time_entries_date ON time_entries(date);
    END IF;

    -- Invoices table indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_user_id') THEN
        CREATE INDEX idx_invoices_user_id ON invoices(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_customer_id') THEN
        CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
    END IF;

    -- Activity logs indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_logs_user_id') THEN
        CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_logs_created_at') THEN
        CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
    END IF;

    -- Integrations table indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_integrations_user_id') THEN
        CREATE INDEX idx_integrations_user_id ON integrations(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_integrations_provider') THEN
        CREATE INDEX idx_integrations_provider ON integrations(provider);
    END IF;
END $$;

-- Create a function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Log successful initialization
INSERT INTO activity_logs (id, user_id, type, description, created_at)
VALUES (
    gen_random_uuid()::text,
    'system',
    'database_init',
    'Database initialized successfully with Docker Compose',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;
