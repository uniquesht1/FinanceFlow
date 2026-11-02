-- Performance Optimization: Create indexes on foreign keys and frequently queried/ordered columns

-- 1. Index on accounts user_id for faster account listing per user
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- 2. Index on transactions user_id and date for fast transaction history loading and chronological ordering
CREATE INDEX IF NOT EXISTS idx_transactions_user_id_date ON public.transactions(user_id, date DESC);

-- 3. Index on transactions account_id to optimize filtering and running balance calculation queries
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);

-- 4. Index on budgets user_id to optimize budget limit checks
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);

-- 5. Index on categories user_id to optimize custom category retrieval
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
