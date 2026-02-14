import React, { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';

export const NetWorthChart: React.FC = () => {
  const { transactions, accounts, selectedCurrency } = useFinance();

  const data = useMemo(() => {
    const currency = selectedCurrency || 'USD';
    const relevantAccounts = accounts.filter(a => a.currency === currency);
    const accountIds = new Set(relevantAccounts.map(a => a.id));
    const relevantTxns = transactions.filter(t => accountIds.has(t.account_id));

    if (relevantTxns.length === 0) return [];

    const startingBalance = relevantAccounts.reduce((sum, a) => sum + Number(a.starting_balance), 0);

    // Get date range
    const dates = relevantTxns.map(t => new Date(t.date));
    const minDate = subMonths(startOfMonth(new Date(Math.min(...dates.map(d => d.getTime())))), 0);
    const maxDate = endOfMonth(new Date());

    const months = eachMonthOfInterval({ start: minDate, end: maxDate });

    let cumulative = startingBalance;
    return months.map(month => {
      const monthEnd = endOfMonth(month);
      const monthTxns = relevantTxns.filter(t => {
        const d = new Date(t.date);
        return d >= month && d <= monthEnd;
      });

      const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      cumulative += income - expense;

      return {
        month: format(month, 'MMM yy'),
        balance: Math.round(cumulative * 100) / 100,
      };
    });
  }, [transactions, accounts, selectedCurrency]);

  if (data.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <CardTitle className="text-base">Net Worth Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
