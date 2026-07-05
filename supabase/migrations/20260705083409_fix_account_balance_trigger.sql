-- Fix account balance trigger to handle updates where transaction account is changed
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

-- Sync current_balance for all accounts to fix any existing discrepancies
UPDATE public.accounts a
SET current_balance = a.starting_balance + (
  COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = a.id AND type = 'income'), 0) -
  COALESCE((SELECT SUM(amount) FROM public.transactions WHERE account_id = a.id AND type = 'expense'), 0)
);
