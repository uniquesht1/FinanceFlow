import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Tags, ArrowRightLeft, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';

export const WelcomeCard: React.FC = () => {
  const { accounts, categories, transactions } = useFinance();

  const steps = [
    {
      label: 'Create your first account',
      description: 'Add a bank account, wallet, or credit card',
      icon: Wallet,
      done: accounts.length > 0,
      link: '/accounts',
    },
    {
      label: 'Set up categories',
      description: 'Organize your income and expenses',
      icon: Tags,
      done: categories.length > 0,
      link: '/categories',
    },
    {
      label: 'Record a transaction',
      description: 'Start tracking your money',
      icon: ArrowRightLeft,
      done: transactions.length > 0,
      link: '/transactions',
    },
  ];

  const completedCount = steps.filter(s => s.done).length;

  if (completedCount === steps.length) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-primary" />
          Welcome to FinanceFlow!
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Get started in 3 easy steps ({completedCount}/{steps.length} done)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link key={step.link} to={step.link}>
              <div className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all duration-200 group">
                <div className="shrink-0">
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${step.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
};
