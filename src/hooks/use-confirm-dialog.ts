import { useState, useCallback } from 'react';

interface UseConfirmDialogReturn {
  isOpen: boolean;
  itemId: string | null;
  requestConfirm: (id: string) => void;
  confirm: () => void;
  cancel: () => void;
}

/**
 * Hook for managing confirmation dialogs (delete, etc.)
 */
export function useConfirmDialog(
  onConfirm: (id: string) => Promise<void>
): UseConfirmDialogReturn {
  const [itemId, setItemId] = useState<string | null>(null);

  const requestConfirm = useCallback((id: string) => {
    setItemId(id);
  }, []);

  const confirm = useCallback(async () => {
    if (itemId) {
      await onConfirm(itemId);
      setItemId(null);
    }
  }, [itemId, onConfirm]);

  const cancel = useCallback(() => {
    setItemId(null);
  }, []);

  return {
    isOpen: itemId !== null,
    itemId,
    requestConfirm,
    confirm,
    cancel,
  };
}
