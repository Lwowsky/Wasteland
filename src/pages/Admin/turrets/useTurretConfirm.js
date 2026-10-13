import { useCallback, useState } from "react";

/** Reuse the site's ConfirmModal. The action runs ONLY after explicit confirmation. */
export default function useTurretConfirm() {
  const [dialog, setDialog] = useState(null);
  const requestConfirm = useCallback(({ title, message, onConfirm, tone = "warning" }) => {
    setDialog({ title, message, onConfirm, tone });
  }, []);
  const closeConfirm = useCallback(() => setDialog(null), []);
  const confirm = useCallback(() => {
    const action = dialog?.onConfirm;
    setDialog(null);
    action?.();
  }, [dialog]);
  return { dialog, requestConfirm, closeConfirm, confirm };
}
