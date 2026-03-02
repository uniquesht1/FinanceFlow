import React, { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  subMonths,
  isBefore,
  startOfYear,
  endOfYear,
  eachYearOfInterval
} from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ViewType = 'monthly' | 'yearly';

export const NetWorthChart: React.FC = () => {
  const { transactions, accounts, selectedCurrency } = useFinance();
  const [view, setView] = useState<ViewType>('monthly');

  const data = useMemo(() => {
    const currency = selectedCurrency || 'USD';
    const relevantAccounts = accounts.filter(a => a.currency === currency);
    const accountIds = new Set(relevantAccounts.map(a => a.id));
    const relevantTxns = transactions.filter(t => accountIds.has(t.account_id));

    if (relevantTxns.length === 0 && relevantAccounts.length === 0) return [];

    // 1. Absolute starting point from accounts
    const startingBalance = relevantAccounts.reduce((sum, a) => sum + Number(a.starting_balance), 0);

    // 2. Determine interval based on view
    const now = new Date();
    let interval: Date[] = [];
    let chartStart: Date;

    if (view === 'monthly') {
      chartStart = startOfMonth(subMonths(now, 11)); // Last 12 months
      interval = eachMonthOfInterval({ start: chartStart, end: endOfMonth(now) });
    } else {
      // Find oldest transaction to determine year start or default to 5 years ago
      const dates = relevantTxns.map(t => parseISO(t.date));
      const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : subMonths(now, 60);
      chartStart = startOfYear(minDate);
      interval = eachYearOfInterval({ start: chartStart, end: endOfYear(now) });
    }

    // 3. Calculate Cumulative Balance prior to chart start
    let cumulativeBalance = startingBalance;
    relevantTxns.forEach(t => {
      const txDate = parseISO(t.date);
      if (isBefore(txDate, chartStart)) {
        const amount = Number(t.amount);
        cumulativeBalance += (t.type === 'income' ? amount : -amount);
      }
    });

    // 4. Map interval to running totals
    return interval.map(date => {
      const periodStart = date;
      const periodEnd = view === 'monthly' ? endOfMonth(date) : endOfYear(date);

      const periodTxns = relevantTxns.filter(t => {
        const d = parseISO(t.date);
        return d >= periodStart && d <= periodEnd;
      });

      const income = periodTxns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = periodTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

      cumulativeBalance += income - expense;

      return {
        label: format(date, view === 'monthly' ? 'MMM yy' : 'yyyy'),
        balance: Math.round(cumulativeBalance * 100) / 100,
      };
    });
  }, [transactions, accounts, selectedCurrency, view]);

  if (data.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">Net Worth Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-medium">No data yet</p>
            <p className="text-sm mt-1">Your net worth trend will appear here once you add transactions.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">Net Worth Trend</CardTitle>
        </div>

        <Select value={view} onValueChange={(v: ViewType) => setView(v)}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly View</SelectItem>
            <SelectItem value="yearly">Yearly View</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                  tickFormatter={(value: number) => {
                    const sym = selectedCurrency || 'USD';
                    const compact = value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${(value/1000).toFixed(1)}k` : String(value);
                    return `${sym} ${compact}`;
                  }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: number) => [`${selectedCurrency || 'USD'} ${value.toLocaleString()}`, 'Net Worth']}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorNetWorth)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};