import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BudgetProgress } from './BudgetProgress';
import type { Category } from '@/types';

interface Budget {
  id: string;
  category_id: string;
  amount: number;
  period: string;
}

interface BudgetCardProps {
  budget: Budget;
  category: Category | undefined;
  spent: number;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({
  budget,
  category,
  spent,
  currency,
  onEdit,
  onDelete,
}) => {
  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  
  const getStatusColor = () => {
    if (percentage > 100) return 'border-destructive/50 bg-destructive/5';
    if (percentage >= 90) return 'border-destructive/30 bg-destructive/5';
    if (percentage >= 75) return 'border-yellow-500/30 bg-yellow-500/5';
    return 'border-border/50';
  };

  return (
    <Card className={`transition-colors ${getStatusColor()}`}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {category?.icon && <span className="text-xl">{category.icon}</span>}
            <div>
              <h3 className="font-medium text-foreground">
                {category?.name || 'Unknown Category'}
              </h3>
              <p className="text-xs text-muted-foreground capitalize">
                {budget.period}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <BudgetProgress 
          spent={spent} 
          budget={budget.amount} 
          currency={currency}
        />
      </CardContent>
    </Card>
  );
};
