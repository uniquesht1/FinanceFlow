import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Download, Calendar, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useFinance } from '@/contexts/FinanceContext';
import { downloadCSV, downloadPDF } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const ExportDataCard: React.FC = () => {
  const { transactions, accounts } = useFinance();
  const { toast } = useToast();
  
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      
      if (startDate && tDate < startDate) return false;
      if (endDate && tDate > endDate) return false;
      if (selectedAccountId !== 'all' && t.account_id !== selectedAccountId) return false;
      
      return true;
    });
  }, [transactions, startDate, endDate, selectedAccountId]);

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      toast({
        title: 'No transactions',
        description: 'No transactions found for the selected filters.',
        variant: 'destructive'
      });
      return;
    }

    const dateStr = startDate && endDate 
      ? `${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}`
      : format(new Date(), 'yyyy-MM-dd');
    
    const exportFn = exportFormat === 'pdf' ? downloadPDF : downloadCSV;
    exportFn({
      transactions: filteredTransactions,
      filename: `transactions_${dateStr}`
    });

    toast({
      title: 'Export successful',
      description: `Exported ${filteredTransactions.length} transactions to ${exportFormat.toUpperCase()}.`
    });
  };

  const handleClearDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download your transactions as CSV</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Format Toggle */}
        <div className="space-y-2">
          <Label>Format</Label>
          <Tabs value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'pdf')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </TabsTrigger>
              <TabsTrigger value="pdf" className="gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Account Filter */}
        <div className="space-y-2">
          <Label>Account</Label>
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transaction count */}
        <p className="text-sm text-muted-foreground">
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} will be exported
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleExport} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {(startDate || endDate) && (
            <Button variant="outline" onClick={handleClearDates}>
              Clear Dates
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
