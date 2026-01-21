-- Run this command if the table already exists to fix the missing default value
ALTER TABLE public.stocking_events 
ALTER COLUMN created_by SET DEFAULT auth.uid();
