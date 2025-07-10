import { cn } from "../../lib/utils";
import { LoadingSpinner } from "./LoadingSpinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loading?: boolean; // Support both for backward compatibility
  loadingText?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode; // Support icon prop for backward compatibility
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  loading = false,
  loadingText,
  fullWidth = false,
  icon,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  // Support both isLoading and loading props
  const isCurrentlyLoading = isLoading || loading;
  // Use icon as leftIcon if leftIcon is not provided
  const actualLeftIcon = leftIcon || icon;
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary:
      "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
    secondary:
      "bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500",
    outline:
      "border border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500",
    ghost: "text-primary-600 hover:bg-primary-50 focus:ring-primary-500",
    danger: "bg-error-600 text-white hover:bg-error-700 focus:ring-error-500",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm min-h-[36px]",
    md: "px-4 py-2 text-sm min-h-[44px]",
    lg: "px-6 py-3 text-base min-h-[48px]",
  };

  const content = isCurrentlyLoading ? loadingText || children : children;

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || isCurrentlyLoading}
      {...props}
    >
      {isCurrentlyLoading && (
        <LoadingSpinner
          size="sm"
          color={
            variant === "outline" || variant === "ghost" ? "primary" : "white"
          }
          className="mr-2"
        />
      )}
      {!isCurrentlyLoading && actualLeftIcon && (
        <span className="mr-2">{actualLeftIcon}</span>
      )}
      {content}
      {!isCurrentlyLoading && rightIcon && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </button>
  );
}

// Common button variations
export function PrimaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button variant="secondary" {...props} />;
}

export function OutlineButton(props: Omit<ButtonProps, "variant">) {
  return <Button variant="outline" {...props} />;
}

export function GhostButton(props: Omit<ButtonProps, "variant">) {
  return <Button variant="ghost" {...props} />;
}

export function DangerButton(props: Omit<ButtonProps, "variant">) {
  return <Button variant="danger" {...props} />;
}

// Icon Button Component
interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  isLoading?: boolean;
  "aria-label": string;
}

export function IconButton({
  icon,
  size = "md",
  variant = "ghost",
  isLoading = false,
  className,
  disabled,
  ...props
}: IconButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary:
      "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
    secondary:
      "bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500",
    outline:
      "border border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500",
    ghost:
      "text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:ring-primary-500",
    danger: "bg-error-600 text-white hover:bg-error-700 focus:ring-error-500",
  };

  const sizeClasses = {
    sm: "p-1.5 min-h-[36px] min-w-[36px]",
    md: "p-2 min-h-[44px] min-w-[44px]",
    lg: "p-3 min-h-[48px] min-w-[48px]",
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <LoadingSpinner
          size="sm"
          color={
            variant === "outline" || variant === "ghost" ? "primary" : "white"
          }
        />
      ) : (
        icon
      )}
    </button>
  );
}
