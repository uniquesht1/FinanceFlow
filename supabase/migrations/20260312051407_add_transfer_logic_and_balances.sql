-- 1. Add transfer flag to transactions
ALTER TABLE public.transactions 
ADD COLUMN is_transfer BOOLEAN NOT NULL DEFAULT false;

-- 2. Add current_balance to accounts for O(1) performance
ALTER TABLE public.accounts 
ADD COLUMN current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0;

-- 3. Function to automatically update account current_balance
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update for the account involved (handles both OLD and NEW for updates/deletes)
    IF (TG_OP = 'DELETE') THEN
        UPDATE public.accounts
        SET current_balance = starting_balance + (
            COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = OLD.account_id AND type = 'income'), 0) -
            COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = OLD.account_id AND type = 'expense'), 0)
        )
        WHERE id = OLD.account_id;
    ELSE
        UPDATE public.accounts
        SET current_balance = starting_balance + (
            COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = NEW.account_id AND type = 'income'), 0) -
            COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = NEW.account_id AND type = 'expense'), 0)
        )
        WHERE id = NEW.account_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to keep current_balance in sync
CREATE TRIGGER on_transaction_change
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- 5. Initial migration for existing data
UPDATE public.transactions SET is_transfer = true WHERE title LIKE '[Transfer]%';

-- 6. Initial sync for all account balances
UPDATE public.accounts a
SET current_balance = a.starting_balance + (
  COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = a.id AND type = 'income'), 0) -
  COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = a.id AND type = 'expense'), 0)
);