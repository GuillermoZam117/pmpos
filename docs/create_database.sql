-- Creates local role and database for development
-- Adjust passwords/usernames as needed

SELECT 'db_exists' FROM pg_database WHERE datname = 'sambapos_central';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'sambapos_central') THEN
    CREATE DATABASE sambapos_central OWNER postgres;
  END IF;
END$$;

GRANT ALL PRIVILEGES ON DATABASE sambapos_central TO postgres;

-- Enable pgcrypto in target DB (run inside sambapos_central)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
