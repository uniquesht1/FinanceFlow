-- Add timezone column to profiles
ALTER TABLE public.profiles ADD COLUMN timezone text DEFAULT 'Asia/Kathmandu';