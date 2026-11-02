import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useFinance } from '@/contexts/FinanceContext';
import { BarChart3 } from 'lucide-react';
import { Transaction } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, differenceInDays, startOfWeek } from 'date-fns';

interface CashFlowBarChartProps {
  transactions: Transaction[];
}

type GroupMode = 'day' | 'week' | 'month';

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--card-foreground))',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

function getGroupMode(transactions: Transaction[]): GroupMode {
  if (transactions.length < 2) return 'day';
  const validDates = transactions
    .map((t) => parseISO(t.date))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (validDates.length < 2) return 'day';
  const span = differenceInDays(validDates[validDates.length - 1], validDates[0]);
  if (span <= 31) return 'day';
  if (span <= 365) return 'week';
  return 'month';
}

function getGroupKey(date: Date, mode: GroupMode): { key: string; label: string } {
  if (mode === 'day') return { key: format(date, 'yyyy-MM-dd'), label: format(date, 'MMM d') };
  if (mode === 'week') {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    return { key: format(weekStart, 'yyyy-MM-dd'), label: format(weekStart, 'MMM d') };
  }
  return { key: format(date, 'yyyy-MM'), label: format(date, 'MMM yy') };
}

export const CashFlowBarChart: React.FC<CashFlowBarChartProps> = ({ transactions }) => {
  const { selectedCurrency, hideMoney } = useFinance();
  const currency = selectedCurrency || 'USD';

  const nonTransfer = useMemo(() => transactions.filter((t) => !t.is_transfer), [transactions]);
  const mode = useMemo(() => getGroupMode(nonTransfer), [nonTransfer]);

  const chartData = useMemo(() => {
    if (nonTransfer.length === 0) return [];
    const groups: Record<string, { label: string; income: number; expense: number }> = {};
    nonTransfer.forEach((t) => {
      const { key, label } = getGroupKey(parseISO(t.date), mode);
      if (!groups[key]) groups[key] = { label, income: 0, expense: 0 };
      if (t.type === 'income') groups[key].income += Number(t.amount);
      else if (t.type === 'expense') groups[key].expense += Number(t.amount);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        label: v.label,
        income: Math.round(v.income * 100) / 100,
        expense: Math.round(v.expense * 100) / 100,
      }));
  }, [nonTransfer, mode]);

  return (
    <Card className="border-border/50 bg-card h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Cash Flow Trends
        </CardTitle>
        {/* Custom legend — clean pill tags */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-destructive flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground">Expense</span>
          </div>
          <span className="text-[11px] text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-1 capitalize">
            by {mode}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <div className="p-3 rounded-full bg-muted">
              <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium">No data for this period</p>
            <p className="text-xs text-muted-foreground/60">Add transactions to see cash flow trends</p>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                barCategoryGap="35%"
                barGap={2}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.6}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => hideMoney ? '•••' : `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    hideMoney ? '••••' : formatCurrency(value, currency),
                    name === 'income' ? 'Income' : 'Expense',
                  ]}
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5, radius: 4 }}
                />
                <Bar dataKey="income" name="income" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
