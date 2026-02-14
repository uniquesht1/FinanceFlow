-- Change date column to timestamp with time zone to store both date and time
ALTER TABLE public.transactions 
ALTER COLUMN date TYPE timestamp with time zone 
USING date::timestamp with time zone;