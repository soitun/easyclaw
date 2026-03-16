import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type ToastType = "success" | "error";

interface ToastState {
  message: string;
  type: ToastType;
  key: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

function ToastContainer({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;
    setExiting(false);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

    timerRef.current = setTimeout(() => {
      setExiting(true);
      exitTimerRef.current = setTimeout(() => {
        onDismiss();
      }, 150);
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [toast?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast) return null;

  const typeClass = toast.type === "error" ? "toast-error" : "toast-success";
  const exitClass = exiting ? " toast-exit" : "";

  return createPortal(
    <div className="toast-container">
      <div className={`toast ${typeClass}${exitClass}`}>
        {toast.message}
      </div>
    </div>,
    document.body,
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const keyRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    keyRef.current += 1;
    setToast({ message, type, key: keyRef.current });
  }, []);

  const handleDismiss = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toast={toast} onDismiss={handleDismiss} />
    </ToastContext.Provider>
  );
}
