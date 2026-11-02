import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useFinance } from '@/contexts/FinanceContext';
import { PieChart as PieIcon, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Transaction } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

const CHART_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#f97316',
  '#14b8a6', '#94a3b8',
];

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--card-foreground))',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

interface CategoryBreakdownChartProps {
  transactions: Transaction[];
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({ transactions }) => {
  const { selectedCurrency, hideMoney } = useFinance();
  const currency = selectedCurrency || 'USD';
  const [viewType, setViewType] = useState<'expense' | 'income'>('expense');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { chartData, total } = useMemo(() => {
    const filtered = transactions.filter((t) => t.type === viewType && !t.is_transfer);
    const categoryTotals: Record<string, { amount: number; count: number }> = {};

    filtered.forEach((t) => {
      const catName = t.category?.name || 'Uncategorized';
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { amount: 0, count: 0 };
      }
      categoryTotals[catName].amount += Number(t.amount);
      categoryTotals[catName].count += 1;
    });

    const sorted = Object.entries(categoryTotals)
      .map(([name, data]) => ({
        name,
        value: Math.round(data.amount * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);

    let data = sorted;
    if (sorted.length > 9) {
      const top9 = sorted.slice(0, 9);
      const otherTotal = sorted.slice(9).reduce((sum, d) => sum + d.value, 0);
      const otherCount = sorted.slice(9).reduce((sum, d) => sum + d.count, 0);
      data = [...top9, { name: 'Other', value: Math.round(otherTotal * 100) / 100, count: otherCount }];
    }

    const totalAmount = sorted.reduce((sum, d) => sum + d.value, 0);
    return { chartData: data, total: totalAmount };
  }, [transactions, viewType]);

  const fmt = (amount: number) => hideMoney ? '••••' : formatCurrency(amount, currency);

  return (
    <Card className="border-border/50 bg-card h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <PieIcon className="h-4 w-4 text-primary" />
          Category Breakdown
        </CardTitle>
        <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewType('expense')}
            className={cn(
              'h-7 px-3 text-xs font-medium rounded-md transition-all',
              viewType === 'expense'
                ? 'bg-card shadow-sm text-destructive font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ArrowDownRight className="h-3.5 w-3.5 mr-1" />
            Expenses
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewType('income')}
            className={cn(
              'h-7 px-3 text-xs font-medium rounded-md transition-all',
              viewType === 'income'
                ? 'bg-card shadow-sm text-emerald-500 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
            Income
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <div className="p-3 rounded-full bg-muted">
              <PieIcon className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium">No {viewType} data in this period</p>
            <p className="text-xs text-muted-foreground/60">Adjust your date or account filter</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Donut Chart */}
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {chartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      hideMoney ? '••••' : formatCurrency(value, currency),
                      name,
                    ]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Rich Detailed Category List */}
            <div className="space-y-2 pt-1 max-h-[220px] overflow-y-auto pr-1">
              {chartData.map((entry, index) => {
                const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                return (
                  <div
                    key={entry.name}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg border border-border/40 transition-colors text-xs',
                      activeIndex === index ? 'bg-muted/70' : 'bg-muted/20 hover:bg-muted/40'
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <div className="truncate">
                        <span className="font-medium text-foreground block truncate">{entry.name}</span>
                        <span className="text-[10px] text-muted-foreground">{entry.count} txns ({pct}%)</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="font-semibold text-foreground block">{fmt(entry.value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Footer */}
            <div className="border-t border-border/50 pt-2.5 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Total {viewType === 'expense' ? 'Expenses' : 'Income'}
              </span>
              <span className="text-sm font-bold text-foreground">{fmt(total)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
