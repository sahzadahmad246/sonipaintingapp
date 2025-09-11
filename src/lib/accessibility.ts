// Accessibility utilities and helpers

export interface AccessibilityOptions {
  skipToContent?: boolean;
  focusManagement?: boolean;
  keyboardNavigation?: boolean;
  screenReaderSupport?: boolean;
  colorContrast?: boolean;
}

// Focus management utilities
export class FocusManager {
  private static trapStack: HTMLElement[] = [];

  // Trap focus within an element
  static trapFocus(element: HTMLElement): void {
    const focusableElements = this.getFocusableElements(element);
    if (focusableElements.length === 0) return;

    this.trapStack.push(element);

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    element.addEventListener("keydown", handleKeyDown);
    firstElement.focus();

    // Store cleanup function
    (element as HTMLElement & { _focusTrapCleanup?: () => void })._focusTrapCleanup = () => {
      element.removeEventListener("keydown", handleKeyDown);
      this.trapStack = this.trapStack.filter(el => el !== element);
    };
  }

  // Release focus trap
  static releaseFocus(element: HTMLElement): void {
    const cleanup = (element as HTMLElement & { _focusTrapCleanup?: () => void })._focusTrapCleanup;
    if (cleanup) {
      cleanup();
    }
  }

  // Get all focusable elements within a container
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      "[tabindex]:not([tabindex='-1'])",
      "[contenteditable='true']",
    ].join(", ");

    return Array.from(container.querySelectorAll(focusableSelectors));
  }

  // Move focus to next focusable element
  static focusNext(): void {
    const focusableElements = this.getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  }

  // Move focus to previous focusable element
  static focusPrevious(): void {
    const focusableElements = this.getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const prevIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    focusableElements[prevIndex]?.focus();
  }
}

// ARIA utilities
export class AriaManager {
  // Announce message to screen readers
  static announce(message: string, priority: "polite" | "assertive" = "polite"): void {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Set ARIA attributes
  static setAttributes(element: HTMLElement, attributes: Record<string, string>): void {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  // Create accessible button
  static createAccessibleButton(
    text: string,
    onClick: () => void,
    options: {
      variant?: "primary" | "secondary" | "danger";
      disabled?: boolean;
      ariaLabel?: string;
      ariaDescribedBy?: string;
    } = {}
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = text;
    button.type = "button";
    button.disabled = options.disabled || false;

    if (options.ariaLabel) {
      button.setAttribute("aria-label", options.ariaLabel);
    }

    if (options.ariaDescribedBy) {
      button.setAttribute("aria-describedby", options.ariaDescribedBy);
    }

    button.addEventListener("click", onClick);
    button.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    });

    return button;
  }

  // Create accessible form field
  static createAccessibleField(
    type: "text" | "email" | "password" | "number" | "tel",
    label: string,
    options: {
      required?: boolean;
      placeholder?: string;
      errorMessage?: string;
      helpText?: string;
    } = {}
  ): { container: HTMLDivElement; input: HTMLInputElement; label: HTMLLabelElement } {
    const container = document.createElement("div");
    container.className = "form-field";

    const labelElement = document.createElement("label");
    labelElement.textContent = label;
    labelElement.className = "form-label";

    const input = document.createElement("input");
    input.type = type;
    input.required = options.required || false;
    input.placeholder = options.placeholder || "";
    input.className = "form-input";

    const id = `field-${Math.random().toString(36).substr(2, 9)}`;
    input.id = id;
    labelElement.setAttribute("for", id);

    container.appendChild(labelElement);
    container.appendChild(input);

    if (options.helpText) {
      const helpText = document.createElement("div");
      helpText.textContent = options.helpText;
      helpText.className = "form-help-text";
      helpText.id = `${id}-help`;
      input.setAttribute("aria-describedby", helpText.id);
      container.appendChild(helpText);
    }

    if (options.errorMessage) {
      const errorElement = document.createElement("div");
      errorElement.textContent = options.errorMessage;
      errorElement.className = "form-error";
      errorElement.id = `${id}-error`;
      errorElement.setAttribute("role", "alert");
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", errorElement.id);
      container.appendChild(errorElement);
    }

    return { container, input, label: labelElement };
  }
}

// Keyboard navigation utilities
export class KeyboardNavigation {
  // Handle arrow key navigation for lists
  static handleArrowNavigation(
    container: HTMLElement,
    options: {
      orientation?: "horizontal" | "vertical";
      loop?: boolean;
      onSelect?: (element: HTMLElement) => void;
    } = {}
  ): void {
    const { orientation = "vertical", loop = true, onSelect } = options;
    const focusableElements = FocusManager.getFocusableElements(container);

    container.addEventListener("keydown", (e) => {
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      const isVertical = orientation === "vertical";

      switch (e.key) {
        case isVertical ? "ArrowDown" : "ArrowRight":
          e.preventDefault();
          nextIndex = loop ? (currentIndex + 1) % focusableElements.length : Math.min(currentIndex + 1, focusableElements.length - 1);
          break;
        case isVertical ? "ArrowUp" : "ArrowLeft":
          e.preventDefault();
          nextIndex = loop ? (currentIndex - 1 + focusableElements.length) % focusableElements.length : Math.max(currentIndex - 1, 0);
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = focusableElements.length - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (onSelect) {
            onSelect(focusableElements[currentIndex]);
          }
          return;
      }

      if (nextIndex !== currentIndex) {
        focusableElements[nextIndex]?.focus();
      }
    });
  }

  // Handle escape key to close modals/dropdowns
  static handleEscapeKey(callback: () => void): () => void {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        callback();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Return cleanup function
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }
}

// Color contrast utilities
export class ColorContrast {
  // Calculate relative luminance
  static getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  // Calculate contrast ratio
  static getContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    const lum1 = this.getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = this.getLuminance(rgb2.r, rgb2.g, rgb2.b);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  // Check if contrast meets WCAG standards
  static meetsWCAG(color1: string, color2: string, level: "AA" | "AAA" = "AA"): boolean {
    const ratio = this.getContrastRatio(color1, color2);
    return level === "AA" ? ratio >= 4.5 : ratio >= 7;
  }

  // Convert hex to RGB
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}

// Screen reader utilities
export class ScreenReader {
  // Hide element from screen readers
  static hideFromScreenReader(element: HTMLElement): void {
    element.setAttribute("aria-hidden", "true");
  }

  // Show element to screen readers
  static showToScreenReader(element: HTMLElement): void {
    element.removeAttribute("aria-hidden");
  }

  // Make element only visible to screen readers
  static screenReaderOnly(element: HTMLElement): void {
    element.className = "sr-only";
  }

  // Create screen reader only text
  static createScreenReaderText(text: string): HTMLSpanElement {
    const span = document.createElement("span");
    span.textContent = text;
    span.className = "sr-only";
    return span;
  }
}

// Skip link utilities
export class SkipLinks {
  // Create skip link
  static createSkipLink(targetId: string, text: string = "Skip to main content"): HTMLAnchorElement {
    const link = document.createElement("a");
    link.href = `#${targetId}`;
    link.textContent = text;
    link.className = "skip-link";
    link.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 1000;
      transition: top 0.3s;
    `;

    link.addEventListener("focus", () => {
      link.style.top = "6px";
    });

    link.addEventListener("blur", () => {
      link.style.top = "-40px";
    });

    return link;
  }

  // Add skip link to page
  static addSkipLink(targetId: string, text?: string): void {
    const skipLink = this.createSkipLink(targetId, text);
    document.body.insertBefore(skipLink, document.body.firstChild);
  }
}

// Accessibility initialization
export function initializeAccessibility(options: AccessibilityOptions = {}): void {
  const {
    skipToContent = true,
    focusManagement = true,
    keyboardNavigation = true,
    screenReaderSupport = true,
  } = options;

  if (skipToContent) {
    SkipLinks.addSkipLink("main-content", "Skip to main content");
  }

  if (focusManagement) {
    // Add focus visible styles
    const style = document.createElement("style");
    style.textContent = `
      .focus-visible {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  if (keyboardNavigation) {
    // Add keyboard navigation styles
    const style = document.createElement("style");
    style.textContent = `
      .keyboard-navigation *:focus {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  if (screenReaderSupport) {
    // Add screen reader only styles
    const style = document.createElement("style");
    style.textContent = `
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `;
    document.head.appendChild(style);
  }
}
