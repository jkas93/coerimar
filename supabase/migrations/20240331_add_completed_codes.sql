-- Add completed_codes to daily_progress to track specific maintenance codes
ALTER TABLE daily_progress ADD COLUMN IF NOT EXISTS completed_codes TEXT;

-- Optional: ensure it's initialized as empty if needed, but NULL is fine for now.
COMMENT ON COLUMN daily_progress.completed_codes IS 'Comma-separated list of codes marked as completed for this activity on this date';
