import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ==========================================
// Page Header Component
// ==========================================

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up', className)}>
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          {icon}
          {title}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          className="group shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
        >
          <Plus className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
          {action.label}
        </Button>
      )}
    </div>
  );
};
