import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface BudgetProgressProps {
  spent: number;
  budget: number;
  currency: string;
}

export const BudgetProgress: React.FC<BudgetProgressProps> = ({ spent, budget, currency }) => {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const remaining = Math.max(budget - spent, 0);
  const isOverBudget = spent > budget;

  const getProgressColor = () => {
    if (isOverBudget) return 'bg-destructive';
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-primary';
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Progress 
          value={percentage} 
          className="h-3"
        />
        <div 
          className={cn(
            "absolute inset-0 h-3 rounded-full transition-all",
            getProgressColor()
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-sm">
        <span className={cn(
          isOverBudget ? 'text-destructive font-medium' : 'text-muted-foreground'
        )}>
          {formatAmount(spent)} / {formatAmount(budget)}
          {isOverBudget && ` (${formatAmount(spent - budget)} over)`}
        </span>
        <span className="text-muted-foreground">
          {isOverBudget ? 'Over budget!' : `${formatAmount(remaining)} left`}
        </span>
      </div>
    </div>
  );
};
