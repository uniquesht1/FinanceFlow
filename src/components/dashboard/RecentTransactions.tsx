import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Clock, ChevronRight } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { Transaction } from '@/types';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
  const navigate = useNavigate();
  // Take the 5 most recent from the already filtered transactions array
  const recentTransactions = transactions.slice(0, 5);

  const handleClick = () => {
    navigate('/transactions');
  };

  return (
    <Card
      className="animate-fade-up border-border/50 overflow-hidden cursor-pointer hover:border-primary/50 transition-all duration-200"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Activity
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {recentTransactions.length === 0 ? (
          <EmptyState
            icon={<ArrowUpRight className="h-8 w-8 text-muted-foreground/30" />}
            title="No activity found"
            description="Transactions for the selected period will appear here."
          />
        ) : (
          <div className="space-y-1">
            {recentTransactions.map((transaction, index) => (
              <div
                key={transaction.id}
                className="group flex items-center justify-between py-3 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-lg hover:bg-muted/50 transition-all duration-200"
                style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      'p-2 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110',
                      transaction.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                    )}
                  >
                    {transaction.type === 'income' ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors duration-200">
                      {transaction.category?.name || 'Uncategorized'}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {transaction.account?.name} • {format(new Date(transaction.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    'font-semibold tabular-nums text-sm sm:text-base ml-2 shrink-0',
                    transaction.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                  )}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(Number(transaction.amount), transaction.account?.currency || 'USD')}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};