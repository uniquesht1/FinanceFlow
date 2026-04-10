import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useFinance } from '@/contexts/FinanceContext';

interface BalanceCardProps {
  title: string;
  amount: number;
  currency?: string;
  type?: 'total' | 'income' | 'expense';
  className?: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  title,
  amount,
  currency = 'USD',
  type = 'total',
  className,
}) => {
  const { hideMoney } = useFinance();
  const [displayAmount, setDisplayAmount] = useState(0);

  // Animated counter effect
  useEffect(() => {
    const duration = 800;
    const steps = 20;
    const increment = amount / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplayAmount(amount);
        clearInterval(timer);
      } else {
        setDisplayAmount(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [amount]);

  const getIcon = () => {
    const iconClasses = 'h-4 w-4 transition-transform duration-300 group-hover:scale-110';
    switch (type) {
      case 'income':
        return <TrendingUp className={cn(iconClasses, 'text-emerald-500')} />;
      case 'expense':
        return <TrendingDown className={cn(iconClasses, 'text-red-500')} />;
      default:
        return <Wallet className={cn(iconClasses, 'text-primary')} />;
    }
  };

  const getAccentColor = () => {
    switch (type) {
      case 'income': return 'bg-emerald-500';
      case 'expense': return 'bg-red-500';
      default: return 'bg-white';
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'income': return 'bg-emerald-500/10';
      case 'expense': return 'bg-red-500/10';
      default: return 'bg-primary/10';
    }
  };

  const getGradient = () => {
    switch (type) {
      case 'income': return 'from-emerald-500/10 to-emerald-500/5';
      case 'expense': return 'from-red-500/10 to-red-500/5';
      default: return 'from-primary/10 to-primary/5';
    }
  };

  const getAmountColor = () => {
    switch (type) {
      case 'income': return 'text-emerald-500';
      case 'expense': return 'text-red-500';
      default: return 'text-white';
    }
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5',
        className
      )}
    >
      {/* Colored top accent line */}
      <div className={cn('absolute top-0 left-0 right-0 h-0.5', getAccentColor())} />

      {/* Gradient background — slightly always on, intensifies on hover */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-[0.05] transition-opacity duration-300 group-hover:opacity-100',
        getGradient()
      )} />

      <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg transition-transform duration-300 group-hover:scale-110', getIconBg())}>
          {getIcon()}
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div
          className={cn(
            'text-xl sm:text-2xl font-bold tabular-nums transition-all duration-300',
            getAmountColor()
          )}
        >
          {hideMoney
            ? 'XXxx'
            : (
              <>
                {type === 'expense' && displayAmount > 0 && '-'}
                {type === 'total'
                  ? formatCurrency(displayAmount, currency)
                  : formatCurrency(Math.abs(displayAmount), currency)}
              </>
            )}
        </div>
      </CardContent>
    </Card>
  );
};
