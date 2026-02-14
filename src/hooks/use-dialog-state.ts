import { useState, useCallback } from 'react';

interface UseDialogStateReturn<T = undefined> {
  isOpen: boolean;
  data: T | undefined;
  open: (data?: T) => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook for managing dialog/modal state with optional data
 */
export function useDialogState<T = undefined>(
  initialOpen = false
): UseDialogStateReturn<T> {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [data, setData] = useState<T | undefined>(undefined);

  const open = useCallback((newData?: T) => {
    setData(newData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Delay clearing data to allow exit animations
    setTimeout(() => setData(undefined), 200);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return { isOpen, data, open, close, toggle };
}
