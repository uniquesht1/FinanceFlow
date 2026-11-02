-- 1. Update the transaction trigger function to correctly handle updating account_ids
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        UPDATE public.accounts
        SET current_balance = starting_balance + (
            COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = OLD.account_id AND type = 'income'), 0) -
            COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = OLD.account_id AND type = 'expense'), 0)
        )
        WHERE id = OLD.account_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Recalculate for the new account
        UPDATE public.accounts
        SET current_balance = starting_balance + (
            COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = NEW.account_id AND type = 'income'), 0) -
            COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = NEW.account_id AND type = 'expense'), 0)
        )
        WHERE id = NEW.account_id;

        -- If the transaction moved to a different account, recalculate for the old account too
        IF (OLD.account_id IS DISTINCT FROM NEW.account_id) THEN
            UPDATE public.accounts
            SET current_balance = starting_balance + (
                COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = OLD.account_id AND type = 'income'), 0) -
                COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = OLD.account_id AND type = 'expense'), 0)
            )
            WHERE id = OLD.account_id;
        END IF;
    ELSE -- INSERT
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

-- 2. Create trigger to update current_balance when starting_balance of an account changes
CREATE OR REPLACE FUNCTION public.sync_account_current_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.current_balance = NEW.starting_balance + (
        COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = NEW.id AND type = 'income'), 0) -
        COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = NEW.id AND type = 'expense'), 0)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it already exists to prevent duplicate trigger errors
DROP TRIGGER IF EXISTS on_account_starting_balance_change ON public.accounts;

CREATE TRIGGER on_account_starting_balance_change
BEFORE UPDATE OF starting_balance ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.sync_account_current_balance();

-- 3. Perform a full sync of current_balance for all accounts to fix any existing discrepancies
UPDATE public.accounts a
SET current_balance = a.starting_balance + (
  COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = a.id AND type = 'income'), 0) -
  COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = a.id AND type = 'expense'), 0)
);
