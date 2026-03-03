# FinanceFlow

A modern, full-stack personal finance tracking application with real-time data synchronization and secure authentication.

---

## Features

- Secure user authentication with Supabase Auth
- Transaction management (create, read, update, delete)
- Real-time financial dashboard
- Persistent PostgreSQL database storage
- Fully responsive design
- Fast performance with Vite

---

## Tech Stack

**Frontend:** React, TypeScript, Vite  
**Backend:** Supabase (PostgreSQL + Auth)  
**Deployment:** Netlify

---

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase account

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/FinanceFlow.git
cd FinanceFlow
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure environment variables**
```bash
cp .env.example .env
```

Update `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**4. Run development server**
```bash
npm run dev
```

Open http://localhost:5173

---

## Database Setup

### 1. Create Supabase Project

- Visit supabase.com
- Create a new project
- Navigate to Settings → API to get your credentials

### 2. Run Database Migration

Execute in Supabase SQL Editor:

```sql
-- Create transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for user-specific access
CREATE POLICY "Users can manage their own transactions"
ON transactions
FOR ALL
USING (auth.uid() = user_id);
```

---

## Production Build

```bash
npm run build
```

Output directory: `dist/`

---

## Deployment

### Deploy to Netlify

1. Push code to GitHub
2. Import repository in Netlify
3. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Add environment variables in Site settings → Environment variables

---

## Project Structure

```
FinanceFlow/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── utils/          # Helper functions
│   └── App.tsx         # Main app component
├── public/             # Static assets
├── .env.example        # Environment template
├── vite.config.ts      # Vite configuration
└── package.json
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_ID` | Supabase project ID | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |


---

## Roadmap

- Data visualization with charts
- Budget planning features
- CSV export functionality
- Dark mode theme
- Multi-currency support
- Recurring transactions

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Author

**Unique Shrestha**  
GitHub: [@uniquesht1](https://github.com/uniquesht1)  
LinkedIn: [shresthaunique](https://www.linkedin.com/in/shresthaunique)
---
