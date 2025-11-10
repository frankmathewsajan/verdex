-- Add onboarding_completed column to existing profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Update existing users to have completed onboarding
-- (so they don't see onboarding screen again)
UPDATE public.profiles 
SET onboarding_completed = TRUE 
WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
