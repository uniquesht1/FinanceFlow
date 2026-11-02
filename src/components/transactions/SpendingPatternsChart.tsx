import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useFinance } from '@/contexts/FinanceContext';
import { CalendarDays, TrendingDown } from 'lucide-react';
import { Transaction } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { parseISO, getDay } from 'date-fns';

interface SpendingPatternsChartProps {
  transactions: Transaction[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const JS_DAY_TO_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
const DAY_COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#8b5cf6'];

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--card-foreground))',
  fontSize: '12px',
  boxShadow: '0 4px 12px hsl(var(--foreground) / 0.1)',
};

export const SpendingPatternsChart: React.FC<SpendingPatternsChartProps> = ({ transactions }) => {
  const { selectedCurrency, hideMoney } = useFinance();
  const currency = selectedCurrency || 'USD';

  const expenses = useMemo(
    () => transactions.filter((t) => t.type === 'expense' && !t.is_transfer),
    [transactions]
  );

  const dayData = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    expenses.forEach((t) => {
      const jsDay = getDay(parseISO(t.date));
      totals[JS_DAY_TO_IDX[jsDay]] += Number(t.amount);
    });
    return DAYS.map((day, idx) => ({
      day,
      amount: Math.round(totals[idx] * 100) / 100,
    }));
  }, [expenses]);

  const maxAmount = useMemo(() => Math.max(...dayData.map((d) => d.amount), 1), [dayData]);
  const peakDay = useMemo(
    () => dayData.reduce((max, d) => (d.amount > max.amount ? d : max), dayData[0]),
    [dayData]
  );

  const topDrivers = useMemo(() => {
    const catTotals: Record<string, number> = {};
    let grandTotal = 0;
    expenses.forEach((t) => {
      const name = t.category?.name || 'Uncategorized';
      const amt = Number(t.amount);
      catTotals[name] = (catTotals[name] || 0) + amt;
      grandTotal += amt;
    });
    return Object.entries(catTotals)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        pct: grandTotal > 0 ? Math.round((value / grandTotal) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [expenses]);

  const fmt = (amount: number) => hideMoney ? '••••' : formatCurrency(amount, currency);
  const hasData = expenses.length > 0;

  return (
    <Card className="border-border/50 bg-card h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-indigo-500" />
          Spending Patterns
        </CardTitle>
        {hasData && (
          <span className="text-[11px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded border border-border/50">
            Peak: {peakDay.day}
          </span>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasData ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
            <div className="p-3 rounded-full bg-muted/50">
              <CalendarDays className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="font-medium">No expense data in this period</p>
            <p className="text-xs text-muted-foreground/60">Spending patterns will appear here</p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Spending by Day of Week</p>
              <div className="h-[145px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="day"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => hideMoney ? '••' : new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(val)}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        hideMoney ? '••••' : formatCurrency(value, currency),
                        'Spent',
                      ]}
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      {dayData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.amount === maxAmount && maxAmount > 0
                            ? '#ef4444'
                            : DAY_COLORS[index % DAY_COLORS.length]}
                          opacity={entry.amount === maxAmount && maxAmount > 0 ? 1 : 0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {topDrivers.length > 0 && (
              <div className="border-t border-border/40 pt-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  Top Outflow Drivers
                </p>
                <div className="space-y-2">
                  {topDrivers.map((driver, idx) => (
                    <div key={driver.name} className="flex items-center gap-3">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: DAY_COLORS[idx % DAY_COLORS.length] }}
                      >
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-xs font-medium text-foreground truncate">{driver.name}</span>
                      <span className="text-[11px] text-muted-foreground">{driver.pct}%</span>
                      <span className="text-xs font-semibold text-foreground min-w-[60px] text-right">
                        {fmt(driver.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
