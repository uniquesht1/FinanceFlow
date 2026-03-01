import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CategoryForm } from '@/components/forms/CategoryForm';
import { useFinance, Category } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { Pencil, Trash2, TrendingUp, TrendingDown, Tags } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const Categories: React.FC = () => {
  const { categories, deleteCategory, loading } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const handleEdit = (category: Category) => {
    setEditCategory(category);
    setShowForm(true);
  };

  const handleCloseForm = (open: boolean) => {
    setShowForm(open);
    if (!open) setEditCategory(undefined);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteCategory(deleteId);
      setDeleteId(null);
    }
  };

  const renderCategoryList = (categoryList: Category[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {categoryList.map((category) => (
        <div
          key={category.id}
          className="group flex items-center justify-between p-4 bg-card border border-border/50 rounded-lg hover:border-primary/30 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-lg transition-transform duration-200 group-hover:scale-110',
                category.type === 'income' ? 'bg-emerald-500/10' : 'bg-destructive/10'
              )}
            >
              {category.type === 'income' ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                {category.name}
              </p>
              {category.is_default && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Default
                </span>
              )}
            </div>
          </div>
          {!category.is_default && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(category)}
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(category.id)}
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <AppLayout>
      {/* Stable Layout — only inner content reacts */}
      {loading && categories.length === 0 ? (
        <LoadingPage message="Loading categories..." />
      ) : (
        <div className="space-y-6">
          <PageHeader
            icon={<Tags className="h-6 w-6 text-primary" />}
            title="Categories"
            description="Organize your income and expenses"
            action={{ label: 'Add Category', onClick: () => setShowForm(true) }}
          />

          <Tabs defaultValue="expense" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 p-1">
              <TabsTrigger value="expense" className="gap-2">
                <TrendingDown className="h-4 w-4" />
                Expenses ({expenseCategories.length})
              </TabsTrigger>
              <TabsTrigger value="income" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Income ({incomeCategories.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expense" className="mt-6">
              {expenseCategories.length === 0 ? (
                <Card className="border-dashed border-2 border-border/50">
                  <CardContent className="py-8">
                    <EmptyState
                      icon={<Tags className="h-8 w-8 text-muted-foreground/50" />}
                      title="No expense categories"
                      description="Add categories to organize your expenses."
                    />
                  </CardContent>
                </Card>
              ) : (
                renderCategoryList(expenseCategories)
              )}
            </TabsContent>

            <TabsContent value="income" className="mt-6">
              {incomeCategories.length === 0 ? (
                <Card className="border-dashed border-2 border-border/50">
                  <CardContent className="py-8">
                    <EmptyState
                      icon={<Tags className="h-8 w-8 text-muted-foreground/50" />}
                      title="No income categories"
                      description="Add categories to organize your income."
                    />
                  </CardContent>
                </Card>
              ) : (
                renderCategoryList(incomeCategories)
              )}
            </TabsContent>
          </Tabs>

          <CategoryForm open={showForm} onOpenChange={handleCloseForm} category={editCategory} />

          <ConfirmDialog
            open={!!deleteId}
            onOpenChange={() => setDeleteId(null)}
            title="Delete Category"
            description="Are you sure you want to delete this category? Transactions using this category will become uncategorized."
            confirmLabel="Delete"
            onConfirm={handleDelete}
          />
        </div>
      )}
    </AppLayout>
  );
};

export default Categories;