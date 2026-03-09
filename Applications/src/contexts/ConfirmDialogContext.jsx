import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDarkMode } from "./DarkModeContext";
import { useLang } from "./LanguageContext";

const ConfirmDialogContext = createContext(null);

const normalizeVariant = (variant) => (variant === "danger" ? "danger" : "default");

export function ConfirmDialogProvider({ children }) {
  const { isDarkMode } = useDarkMode();
  const { t } = useLang();
  const queueRef = useRef([]);
  const resolverRef = useRef(null);
  const [dialog, setDialog] = useState(null);

  const mapOptions = useCallback(
    (options = {}) => {
      const variant = normalizeVariant(options.variant);
      const fallbackConfirmText =
        variant === "danger" ? t("delete") || "Delete" : t("confirm") || "Confirm";

      return {
        title: options.title || t("confirmActionTitle") || "Confirm action",
        message:
          options.message ||
          t("confirmActionMessage") ||
          "Are you sure you want to continue?",
        confirmText: options.confirmText || fallbackConfirmText,
        cancelText: options.cancelText || t("cancel") || "Cancel",
        closeOnBackdrop: options.closeOnBackdrop !== false,
        closeOnEsc: options.closeOnEsc !== false,
        variant,
      };
    },
    [t],
  );

  const openNext = useCallback(() => {
    if (resolverRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    resolverRef.current = next.resolve;
    setDialog(mapOptions(next.options));
  }, [mapOptions]);

  const closeDialog = useCallback(
    (result) => {
      const resolver = resolverRef.current;
      resolverRef.current = null;
      setDialog(null);
      if (resolver) resolver(result);
      Promise.resolve().then(openNext);
    },
    [openNext],
  );

  const confirm = useCallback(
    (options = {}) =>
      new Promise((resolve) => {
        queueRef.current.push({ options, resolve });
        openNext();
      }),
    [openNext],
  );

  useEffect(() => {
    if (!dialog?.closeOnEsc) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeDialog(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dialog?.closeOnEsc, closeDialog]);

  useEffect(
    () => () => {
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
      queueRef.current.forEach((entry) => entry.resolve(false));
      queueRef.current = [];
    },
    [],
  );

  const contextValue = useMemo(() => ({ confirm }), [confirm]);

  const borderClass = isDarkMode ? "border-slate-700" : "border-gray-200";
  const panelClass = isDarkMode ? "sf-dark-card sf-dark-border" : "bg-white border-gray-200";
  const titleClass = isDarkMode ? "text-white" : "text-gray-900";
  const messageClass = isDarkMode ? "text-slate-300" : "text-gray-600";
  const cancelClass = isDarkMode
    ? "bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"
    : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200";
  const confirmClass =
    dialog?.variant === "danger"
      ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
      : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700";

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (dialog.closeOnBackdrop) closeDialog(false);
          }}
        >
          <div
            className={`w-full max-w-sm rounded-2xl border shadow-2xl ${panelClass}`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={dialog.title}
          >
            <div className={`border-b px-5 py-4 ${borderClass}`}>
              <h3 className={`text-lg font-semibold ${titleClass}`}>{dialog.title}</h3>
            </div>
            <div className="px-5 py-4">
              <p className={`text-sm leading-relaxed ${messageClass}`}>{dialog.message}</p>
            </div>
            <div className={`flex gap-3 border-t px-5 py-4 ${borderClass}`}>
              <button
                type="button"
                onClick={() => closeDialog(false)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${cancelClass}`}
              >
                {dialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => closeDialog(true)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${confirmClass}`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  }
  return context;
}
