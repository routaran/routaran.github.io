import { useToast as useToastContext } from "../contexts/ToastContext";

export interface ShowToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive" | "warning";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const { addToast } = useToastContext();

  const showToast = (options: ShowToastOptions) => {
    const type =
      options.variant === "destructive"
        ? "error"
        : options.variant === "success"
          ? "success"
          : options.variant === "warning"
            ? "warning"
            : "info";

    addToast({
      type,
      title: options.title,
      description: options.description,
      duration: options.duration,
      action: options.action,
    });
  };

  return { showToast, toast: showToast }; // 'toast' for backward compatibility
}
