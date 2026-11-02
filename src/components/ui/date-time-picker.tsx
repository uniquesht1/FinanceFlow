import * as React from 'react';
import { CalendarDays } from 'lucide-react';
import { useTimezone } from '@/contexts/TimezoneContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  date: Date;
  onChange: (date: Date) => void;
  className?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  date,
  onChange,
  className,
}) => {
  const { formatDateInTimezone, formatDateTimeLocalValue, parseDateTimeLocalValue } = useTimezone();
  const [isOpen, setIsOpen] = React.useState(false);

  // Extract date and time strings in the user's preferred timezone
  const localValue = formatDateTimeLocalValue(date);
  const [datePart, timePart] = localValue.split('T');

  // Convert the datePart (YYYY-MM-DD) into a local Date object for the Calendar picker
  const calendarDate = React.useMemo(() => {
    const [y, m, d] = datePart.split('-').map(Number);
    // Create Date in local timezone corresponding to the datePart
    return new Date(y, m - 1, d);
  }, [datePart]);

  const handleDateChange = (newDay: Date | undefined) => {
    if (!newDay) return;
    
    // Format selected day to YYYY-MM-DD
    const y = newDay.getFullYear();
    const m = String(newDay.getMonth() + 1).padStart(2, '0');
    const d = String(newDay.getDate()).padStart(2, '0');
    const newDatePart = `${y}-${m}-${d}`;

    // Combine and parse back to UTC Date
    const combined = `${newDatePart}T${timePart}`;
    onChange(new Date(parseDateTimeLocalValue(combined)));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value; // Format: HH:mm
    if (!newTime) return;

    // Combine and parse back to UTC Date
    const combined = `${datePart}T${newTime}`;
    onChange(new Date(parseDateTimeLocalValue(combined)));
  };

  const setNow = () => {
    onChange(new Date());
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 justify-start text-left font-normal h-10 px-3 py-2 border-border/50 hover:border-primary/30 transition-all rounded-xl text-sm"
            >
              <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{formatDateInTimezone(date)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 pointer-events-auto rounded-xl border-border/50 shadow-lg" align="start">
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={(d) => {
                handleDateChange(d);
                setIsOpen(false);
              }}
              initialFocus
            />
            <div className="flex items-center justify-between gap-2 border-t border-border/50 p-3 bg-muted/20">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</span>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={timePart}
                  onChange={handleTimeChange}
                  className="w-28 h-8 px-2 py-1 text-xs rounded-lg border-border/50 focus-visible:ring-1 focus-visible:ring-primary"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setNow}
                  className="h-8 px-2.5 text-xs font-medium rounded-lg border-border/50"
                >
                  Now
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
