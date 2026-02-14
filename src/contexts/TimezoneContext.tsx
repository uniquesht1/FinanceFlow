import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type TimezoneOption = 'Asia/Kathmandu' | 'Australia/Sydney';

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

interface TimezoneContextType {
  timezone: TimezoneOption;
  setTimezone: (tz: TimezoneOption) => Promise<void>;

  // Display helpers
  formatDateInTimezone: (date: Date | string) => string;

  // datetime-local helpers (treat input/output as "wall-clock" in selected timezone)
  formatDateTimeLocalValue: (date: Date | string) => string; // YYYY-MM-DDTHH:mm
  parseDateTimeLocalValue: (value: string) => string; // ISO string (UTC)
}

// Default functions for when context is accessed outside provider (edge cases like HMR)
const defaultFormatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

const defaultFormatDateTimeLocal = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 16);
};

const defaultParseDateTimeLocal = (value: string) => new Date(value).toISOString();

const defaultContextValue: TimezoneContextType = {
  timezone: 'Asia/Kathmandu',
  setTimezone: async () => {},
  formatDateInTimezone: defaultFormatDate,
  formatDateTimeLocalValue: defaultFormatDateTimeLocal,
  parseDateTimeLocalValue: defaultParseDateTimeLocal,
};

const TimezoneContext = createContext<TimezoneContextType>(defaultContextValue);

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function getTzParts(date: Date, timeZone: string): DateTimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

export const TimezoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [timezone, setTimezoneState] = useState<TimezoneOption>('Asia/Kathmandu');

  useEffect(() => {
    const fetchTimezone = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.timezone) {
        setTimezoneState(data.timezone as TimezoneOption);
      }
    };

    fetchTimezone();
  }, [user]);

  const setTimezone = async (tz: TimezoneOption) => {
    if (!user) return;

    setTimezoneState(tz);
    await supabase.from('profiles').update({ timezone: tz }).eq('id', user.id);
  };

  const formatDateInTimezone = useCallback(
    (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;

      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    },
    [timezone]
  );

  const formatDateTimeLocalValue = useCallback(
    (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const p = getTzParts(d, timezone);
      return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
    },
    [timezone]
  );

  const parseDateTimeLocalValue = useCallback(
    (value: string) => {
      // value format: YYYY-MM-DDTHH:mm
      const [datePart, timePart] = value.split('T');
      if (!datePart || !timePart) return new Date(value).toISOString();

      const [y, m, d] = datePart.split('-').map(Number);
      const [hh, mm] = timePart.split(':').map(Number);
      if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return new Date(value).toISOString();

      const desiredAsUtc = Date.UTC(y, m - 1, d, hh, mm, 0);
      let guess = new Date(desiredAsUtc);

      // Two-pass correction (handles DST transitions reasonably well)
      for (let i = 0; i < 2; i++) {
        const actual = getTzParts(guess, timezone);
        const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, 0);
        const diff = desiredAsUtc - actualAsUtc;
        if (diff === 0) break;
        guess = new Date(guess.getTime() + diff);
      }

      return guess.toISOString();
    },
    [timezone]
  );

  return (
    <TimezoneContext.Provider
      value={{ timezone, setTimezone, formatDateInTimezone, formatDateTimeLocalValue, parseDateTimeLocalValue }}
    >
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezone = () => {
  return useContext(TimezoneContext);
};

