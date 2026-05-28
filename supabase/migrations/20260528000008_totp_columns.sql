-- ==============================================================================
-- Migration: 20260528000008_totp_columns
-- Task: 7.1 -- TOTP support for admin double-authentication
-- ==============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS totp_secret    TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled   BOOLEAN NOT NULL DEFAULT false;
