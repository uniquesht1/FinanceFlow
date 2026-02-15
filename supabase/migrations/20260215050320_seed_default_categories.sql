INSERT INTO public.categories (name, type, icon, is_default)
VALUES 
  ('Bills & Utilities', 'expense', 'zap', true),
  ('Education', 'expense', 'book', true),
  ('Entertainment', 'expense', 'play', true),
  ('Food & Dining', 'expense', 'utensils', true),
  ('Groceries', 'expense', 'shopping-cart', true),
  ('Healthcare', 'expense', 'heart', true),
  ('Other Expense', 'expense', 'minus-circle', true),
  ('Shopping', 'expense', 'shopping-bag', true),
  ('Transportation', 'expense', 'car', true),
  ('Travel', 'expense', 'plane', true),
  ('Freelance', 'income', 'laptop', true),
  ('Investments', 'income', 'trending-up', true),
  ('Salary', 'income', 'banknote', true),
  ('Other Income', 'income', 'plus-circle', true)
ON CONFLICT DO NOTHING;