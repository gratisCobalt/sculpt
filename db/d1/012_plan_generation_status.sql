-- Add plan_generation_status column to track async AI plan generation
-- Values: NULL (idle/completed), 'pending', 'failed'
ALTER TABLE app_user ADD COLUMN plan_generation_status TEXT DEFAULT NULL;
