-- Add title column to transactions
ALTER TABLE public.transactions 
ADD COLUMN title text;