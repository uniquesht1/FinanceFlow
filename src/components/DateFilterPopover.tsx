import React, { useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface DateFilterPopoverProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onClear: () => void;
}

export const DateFilterPopover: React.FC<DateFilterPopoverProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}) => {
  const [mode, setMode] = useState<'specific' | 'range'>('range');
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Temporary state for range mode - only applied when user clicks "Apply"
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endDate);

  // Sync temp state when popover opens or external dates change
  useEffect(() => {
    if (open) {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
    }
  }, [open, startDate, endDate]);

  const hasDateFilter = startDate || endDate;
  const hasTempDateFilter = tempStartDate || tempEndDate;
  const isSpecificDate = startDate && endDate && isSameDay(startDate, endDate);

  // Check if dates span different years for display purposes
  const spansDifferentYears = tempStartDate && tempEndDate && 
    tempStartDate.getFullYear() !== tempEndDate.getFullYear();

  const getDateFilterLabel = () => {
    if (isSpecificDate && startDate) {
      return format(startDate, 'MMM d, yyyy');
    }
    if (startDate && endDate) {
      // Show year if dates span different years
      if (startDate.getFullYear() !== endDate.getFullYear()) {
        return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
      }
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    if (startDate) {
      return `From ${format(startDate, 'MMM d, yyyy')}`;
    }
    if (endDate) {
      return `Until ${format(endDate, 'MMM d, yyyy')}`;
    }
    return 'Filter by date';
  };

  const formatTempDateButton = (date: Date | undefined, label: string) => {
    if (!date) return label;
    if (spansDifferentYears) {
      return format(date, 'MMM d, yyyy');
    }
    return format(date, 'MMM d');
  };

  const handleSpecificDateSelect = (date: Date | undefined) => {
    if (date) {
      onStartDateChange(date);
      onEndDateChange(date);
      setOpen(false);
    }
  };

  const handleRangeStartSelect = (date: Date | undefined) => {
    setTempStartDate(date);
    if (date) {
      // Auto-switch to end date selection
      setSelectingEnd(true);
    }
  };

  const handleRangeEndSelect = (date: Date | undefined) => {
    setTempEndDate(date);
    if (date) {
      setSelectingEnd(false);
    }
  };

  const handleApplyFilter = () => {
    onStartDateChange(tempStartDate);
    onEndDateChange(tempEndDate);
    setSelectingEnd(false);
    setOpen(false);
  };

  const handleClearTemp = () => {
    setTempStartDate(undefined);
    setTempEndDate(undefined);
    setSelectingEnd(false);
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as 'specific' | 'range');
    setSelectingEnd(false);
    // Clear temp dates when switching modes
    setTempStartDate(undefined);
    setTempEndDate(undefined);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
    setTempStartDate(undefined);
    setTempEndDate(undefined);
    setSelectingEnd(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full sm:w-auto justify-start gap-2 transition-all duration-200 hover:border-primary/50',
            hasDateFilter && 'border-primary/50 bg-primary/5'
          )}
        >
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{getDateFilterLabel()}</span>
          {hasDateFilter && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date filter"
              className="ml-1 inline-flex"
              onPointerDown={(e) => {
                // Prevent the PopoverTrigger from opening when clearing
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // synthesize a click-like clear
                  onClear();
                  setSelectingEnd(false);
                }
              }}
            >
              <X className="h-3 w-3 hover:text-destructive" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
          <div className="p-3 border-b border-border">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="specific">Specific Date</TabsTrigger>
              <TabsTrigger value="range">Date Range</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="specific" className="m-0">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleSpecificDateSelect}
              className="pointer-events-auto"
            />
          </TabsContent>
          
          <TabsContent value="range" className="m-0">
            <div className="p-3 border-b border-border">
              <div className="flex gap-2">
                <Button
                  variant={!selectingEnd ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectingEnd(false)}
                >
                  {formatTempDateButton(tempStartDate, 'Start Date')}
                </Button>
                <Button
                  variant={selectingEnd ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectingEnd(true)}
                >
                  {formatTempDateButton(tempEndDate, 'End Date')}
                </Button>
              </div>
            </div>
            <Calendar
              mode="single"
              selected={selectingEnd ? tempEndDate : tempStartDate}
              onSelect={selectingEnd ? handleRangeEndSelect : handleRangeStartSelect}
              disabled={selectingEnd && tempStartDate ? (date) => date < tempStartDate : undefined}
              className="pointer-events-auto"
            />
            {hasTempDateFilter && (
              <div className="p-3 border-t border-border flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={handleClearTemp}>
                  Clear
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={handleApplyFilter}
                  disabled={!tempStartDate || !tempEndDate}
                >
                  Apply Filter
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {hasDateFilter && (
          <div className="p-3 border-t border-border">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { onClear(); setTempStartDate(undefined); setTempEndDate(undefined); setSelectingEnd(false); setOpen(false); }}>
              Clear dates
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};