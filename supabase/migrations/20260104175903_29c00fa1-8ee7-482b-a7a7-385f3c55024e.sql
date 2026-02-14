-- Create tracker_items table for expense wishlist and income reminders
CREATE TABLE public.tracker_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  title TEXT NOT NULL,
  estimated_amount NUMERIC NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tracker_items ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own tracker items" 
ON public.tracker_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tracker items" 
ON public.tracker_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracker items" 
ON public.tracker_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracker items" 
ON public.tracker_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tracker_items_updated_at
BEFORE UPDATE ON public.tracker_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();