import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

// Skip Link Component for keyboard navigation
interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[44px] flex items-center font-medium"
    >
      {children}
    </a>
  );
}

// Focus Trap Component for modals and dropdowns
interface FocusTrapProps {
  children: React.ReactNode;
  isActive: boolean;
  onEscape?: () => void;
}

export function FocusTrap({ children, isActive, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, onEscape]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
}

// Screen Reader Only Component
interface ScreenReaderOnlyProps {
  children: React.ReactNode;
}

export function ScreenReaderOnly({ children }: ScreenReaderOnlyProps) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}

// Visually Hidden Component (but available to screen readers)
interface VisuallyHiddenProps {
  children: React.ReactNode;
  className?: string;
}

export function VisuallyHidden({ children, className }: VisuallyHiddenProps) {
  return (
    <span 
      className={cn(
        'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
        className
      )}
    >
      {children}
    </span>
  );
}

// Announcement Component for live regions
interface AnnouncementProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

export function Announcement({ message, priority = 'polite' }: AnnouncementProps) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Focus Management Hook
export function useFocusManagement() {
  const previousFocus = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousFocus.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previousFocus.current) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  };

  const focusElement = (element: HTMLElement | null) => {
    if (element) {
      element.focus();
    }
  };

  return {
    saveFocus,
    restoreFocus,
    focusElement,
  };
}

// Reduced Motion Hook
export function useReducedMotion() {
  const prefersReducedMotion = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return prefersReducedMotion;
}

// Accessibility Checker (for development)
export function AccessibilityChecker() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Check for missing alt text on images
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) {
        console.warn('⚠️ A11Y: Found images without alt text:', images);
      }

      // Check for buttons without accessible names
      const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
      const buttonsWithoutText = Array.from(buttons).filter(btn => !btn.textContent?.trim());
      if (buttonsWithoutText.length > 0) {
        console.warn('⚠️ A11Y: Found buttons without accessible names:', buttonsWithoutText);
      }

      // Check for form inputs without labels
      const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
      const inputsWithoutLabels = Array.from(inputs).filter(input => {
        const id = input.getAttribute('id');
        return !id || !document.querySelector(`label[for="${id}"]`);
      });
      if (inputsWithoutLabels.length > 0) {
        console.warn('⚠️ A11Y: Found inputs without labels:', inputsWithoutLabels);
      }
    }
  }, []);

  return null;
}

// Color Contrast Utilities
export const colorContrast = {
  // WCAG AA compliant text colors for different backgrounds
  text: {
    onWhite: 'text-gray-900', // High contrast
    onLight: 'text-gray-800', // High contrast
    onDark: 'text-white', // High contrast
    onPrimary: 'text-white', // High contrast on primary backgrounds
    secondary: 'text-gray-600', // Medium contrast for secondary text
    muted: 'text-gray-500', // Lower contrast for muted text
  },
  
  // Background colors with appropriate text colors
  backgrounds: {
    primary: 'bg-primary-600 text-white',
    secondary: 'bg-secondary-600 text-white',
    success: 'bg-success-600 text-white',
    warning: 'bg-warning-600 text-white',
    error: 'bg-error-600 text-white',
    light: 'bg-gray-100 text-gray-900',
    dark: 'bg-gray-900 text-white',
  },
  
  // Border colors that meet contrast requirements
  borders: {
    default: 'border-gray-300',
    focus: 'border-primary-500',
    error: 'border-error-500',
    success: 'border-success-500',
    warning: 'border-warning-500',
  },
};

// Motion Utilities
export const motionUtils = {
  // Respect user's motion preferences
  transition: 'transition-all duration-200 motion-reduce:transition-none',
  animate: 'animate-pulse motion-reduce:animate-none',
  transform: 'transform motion-reduce:transform-none',
  
  // Safe animation classes
  fadeIn: 'opacity-0 animate-fade-in motion-reduce:opacity-100 motion-reduce:animate-none',
  slideIn: 'transform translate-x-full animate-slide-in motion-reduce:transform-none motion-reduce:animate-none',
  bounce: 'animate-bounce motion-reduce:animate-none',
};