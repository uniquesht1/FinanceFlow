import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useFinance } from '@/contexts/FinanceContext';
import { HandCoins, CheckCircle2, AlertCircle } from 'lucide-react';
import { Transaction } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

interface BorrowTrackerChartProps {
  transactions: Transaction[];
}

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--card-foreground))',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

const BORROW_KEYWORDS = ['borrow', 'lend', 'lent', 'loan', 'debt'];
const REPAYMENT_INCOME_KEYWORDS = ['lent returned', 'given back', 'repaid to me', 'received back', 'got back', 'returned by'];
const REPAYMENT_EXPENSE_KEYWORDS = ['borrow return', 'repaid', 'paid back', 'loan repayment', 'repay', 'returning loan'];

function isBorrowRelated(t: Transaction): boolean {
  const haystack = [t.category?.name ?? '', t.title ?? '', t.note ?? ''].join(' ').toLowerCase();
  return BORROW_KEYWORDS.some((kw) => haystack.includes(kw));
}

function classifyTransaction(t: Transaction): 'BORROWED' | 'BORROW_RETURNED' | 'LENT' | 'LENT_RETURNED' | null {
  if (!isBorrowRelated(t)) return null;
  const haystack = [t.category?.name ?? '', t.title ?? '', t.note ?? ''].join(' ').toLowerCase();
  if (t.type === 'income') {
    return REPAYMENT_INCOME_KEYWORDS.some((kw) => haystack.includes(kw)) ? 'LENT_RETURNED' : 'BORROWED';
  }
  if (t.type === 'expense') {
    return REPAYMENT_EXPENSE_KEYWORDS.some((kw) => haystack.includes(kw)) ? 'BORROW_RETURNED' : 'LENT';
  }
  return null;
}

export const BorrowTrackerChart: React.FC<BorrowTrackerChartProps> = ({ transactions }) => {
  const { selectedCurrency, hideMoney } = useFinance();
  const currency = selectedCurrency || 'USD';

  const metrics = useMemo(() => {
    let totalBorrowed = 0, borrowReturned = 0, totalLent = 0, lentReturned = 0, detectedCount = 0;
    transactions.forEach((t) => {
      if (t.is_transfer) return;
      const cls = classifyTransaction(t);
      if (!cls) return;
      detectedCount++;
      const amt = Number(t.amount);
      if (cls === 'BORROWED') totalBorrowed += amt;
      else if (cls === 'BORROW_RETURNED') borrowReturned += amt;
      else if (cls === 'LENT') totalLent += amt;
      else if (cls === 'LENT_RETURNED') lentReturned += amt;
    });
    const outstandingDebt = Math.max(0, totalBorrowed - borrowReturned);
    const outstandingLent = Math.max(0, totalLent - lentReturned);
    const repaymentPct = totalBorrowed > 0 ? Math.min(100, Math.round((borrowReturned / totalBorrowed) * 100)) : 0;
    const lentRecoveryPct = totalLent > 0 ? Math.min(100, Math.round((lentReturned / totalLent) * 100)) : 0;
    return {
      totalBorrowed: Math.round(totalBorrowed * 100) / 100,
      borrowReturned: Math.round(borrowReturned * 100) / 100,
      totalLent: Math.round(totalLent * 100) / 100,
      lentReturned: Math.round(lentReturned * 100) / 100,
      outstandingDebt: Math.round(outstandingDebt * 100) / 100,
      outstandingLent: Math.round(outstandingLent * 100) / 100,
      repaymentPct, lentRecoveryPct, detectedCount,
    };
  }, [transactions]);

  const chartData = useMemo(() => [
    { name: 'Borrowed', Borrowed: metrics.totalBorrowed, Repaid: metrics.borrowReturned },
    { name: 'Lent', Lent: metrics.totalLent, Returned: metrics.lentReturned },
  ], [metrics]);

  const fmt = (amount: number) => hideMoney ? '••••' : formatCurrency(amount, currency);

  const statCards = [
    { label: 'Borrowed', value: metrics.totalBorrowed, sub: `Repaid ${fmt(metrics.borrowReturned)}`, subGreen: true, outstanding: metrics.outstandingDebt, outstandingLabel: 'still owed', alertColor: 'text-amber-500' },
    { label: 'Lent Out', value: metrics.totalLent, sub: `Returned ${fmt(metrics.lentReturned)}`, subGreen: true, outstanding: metrics.outstandingLent, outstandingLabel: 'pending return', alertColor: 'text-blue-400' },
  ];

  return (
    <Card className="border-border/50 bg-card h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <HandCoins className="h-4 w-4 text-amber-500" />
          Borrow &amp; Debt Tracker
        </CardTitle>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium border border-amber-500/20">
          {metrics.detectedCount} {metrics.detectedCount === 1 ? 'record' : 'records'}
        </span>
      </CardHeader>

      <CardContent className="space-y-4">
        {metrics.detectedCount === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <div className="p-3 rounded-full bg-muted">
              <HandCoins className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium">No borrow/loan transactions</p>
            <p className="text-xs text-muted-foreground/60 text-center max-w-[200px]">
              Tag a transaction with "Borrow", "Loan", or "Lend" keywords
            </p>
          </div>
        ) : (
          <>
            {/* 2-column stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {statCards.map((item) => (
                <div key={item.label} className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{item.label}</p>
                  <p className="text-lg font-bold text-foreground">{fmt(item.value)}</p>
                  <p className="text-[11px] text-emerald-500">{item.sub}</p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {item.outstanding > 0
                      ? <AlertCircle className={cn('h-3 w-3 flex-shrink-0', item.alertColor)} />
                      : <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                    }
                    <p className={cn('text-[11px] font-medium',
                      item.outstanding > 0 ? item.alertColor : 'text-emerald-500'
                    )}>
                      {item.outstanding > 0 ? `${fmt(item.outstanding)} ${item.outstandingLabel}` : 'Fully settled'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Repayment progress</span>
                <span className="font-semibold text-foreground">{metrics.repaymentPct}%</span>
              </div>
              <Progress value={metrics.repaymentPct} className="h-1.5" />
            </div>

            {/* Comparison bar chart — no Legend component */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                {[
                  { color: '#f59e0b', label: 'Borrowed' },
                  { color: '#22c55e', label: 'Repaid' },
                  { color: '#3b82f6', label: 'Lent' },
                  { color: '#10b981', label: 'Returned' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
              <div className="h-[100px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                    barCategoryGap="30%"
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => hideMoney ? '•••' : `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={55}
                    />
                    <Tooltip
                      formatter={(value: number) => [hideMoney ? '••••' : formatCurrency(value, currency), 'Amount']}
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                    />
                    <Bar dataKey="Borrowed" fill="#f59e0b" radius={[0, 3, 3, 0]} maxBarSize={16} />
                    <Bar dataKey="Repaid" fill="#22c55e" radius={[0, 3, 3, 0]} maxBarSize={16} />
                    <Bar dataKey="Lent" fill="#3b82f6" radius={[0, 3, 3, 0]} maxBarSize={16} />
                    <Bar dataKey="Returned" fill="#10b981" radius={[0, 3, 3, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
