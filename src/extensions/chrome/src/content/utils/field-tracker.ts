/**
 * Real-time field value tracking utilities
 * Detects values from browser autofill, password managers, and programmatic changes
 */

import { isPasswordField, isUsernameField } from "../detectors";
import { formData, setFormData } from "../state";

/** Tracking interval in milliseconds */
const TRACK_INTERVAL = 500;

/** Set of tracked input elements */
const trackedInputs = new Set<HTMLInputElement>();

/** Interval ID for periodic value checks */
let trackingIntervalId: number | null = null;

/** Previous values for change detection */
const previousValues = new Map<HTMLInputElement, string>();

/**
 * Check if a value was autofilled by browser or password manager
 * Uses multiple detection methods for reliability
 */
const isAutofilled = (input: HTMLInputElement): boolean => {
  // Method 1: Check :-webkit-autofill pseudo-class (Chrome, Safari)
  try {
    if (input.matches(":-webkit-autofill")) {
      return true;
    }
  } catch {
    // Pseudo-class not supported
  }

  // Method 2: Check autofill attribute
  if (
    input.hasAttribute("data-autofilled") ||
    input.getAttribute("autocompleted") === "yes"
  ) {
    return true;
  }

  // Method 3: Check computed background color (autofilled fields often have yellow background)
  const style = window.getComputedStyle(input);
  const bgColor = style.backgroundColor;
  // Chrome autofill typically uses rgb(232, 240, 254) or rgb(250, 255, 189)
  if (bgColor.includes("232, 240, 254") || bgColor.includes("250, 255, 189")) {
    return true;
  }

  // Method 4: Check if value exists but input event wasn't triggered
  if (input.value && !input.dataset.shadeInputDetected) {
    return true;
  }

  return false;
};

/**
 * Handle value changes for a tracked input
 */
const handleValueChange = (input: HTMLInputElement): void => {
  const currentValue = input.value;
  const previousValue = previousValues.get(input) || "";

  // Only process if value actually changed
  if (currentValue === previousValue) {
    return;
  }

  previousValues.set(input, currentValue);

  // Skip empty values
  if (!currentValue) {
    return;
  }

  // Determine field type and update form data
  if (isPasswordField(input)) {
    const wasAutofilled = isAutofilled(input);
    console.log(
      "[Shade] Password value detected",
      wasAutofilled ? "(autofilled)" : "(user input)"
    );
    setFormData("password", currentValue);
  } else if (isUsernameField(input)) {
    const wasAutofilled = isAutofilled(input);
    console.log(
      "[Shade] Username value detected",
      wasAutofilled ? "(autofilled)" : "(user input)"
    );
    setFormData("username", currentValue);
  }
};

/**
 * Check all tracked inputs for value changes
 * Called periodically to catch programmatic and autofill changes
 */
const checkAllTrackedInputs = (): void => {
  trackedInputs.forEach((input) => {
    // Skip if input is no longer in DOM
    if (!document.body.contains(input) && !isInShadowDOM(input)) {
      trackedInputs.delete(input);
      previousValues.delete(input);
      return;
    }

    handleValueChange(input);
  });
};

/**
 * Check if an element is inside a Shadow DOM
 */
const isInShadowDOM = (element: Element): boolean => {
  let current: Node | null = element;
  while (current) {
    if (current instanceof ShadowRoot) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
};

/**
 * Add animationstart listener for autofill detection
 * Chrome triggers animation on autofilled inputs
 */
const setupAutofillAnimation = (input: HTMLInputElement): void => {
  // Inject CSS animation for autofill detection if not already present
  if (!document.getElementById("shade-autofill-style")) {
    const style = document.createElement("style");
    style.id = "shade-autofill-style";
    style.textContent = `
      @keyframes shadeAutofillDetect {
        from { opacity: 1; }
        to { opacity: 1; }
      }
      input:-webkit-autofill {
        animation-name: shadeAutofillDetect;
        animation-duration: 0.001s;
      }
    `;
    document.head.appendChild(style);
  }

  // Listen for animation to detect autofill
  input.addEventListener("animationstart", (e) => {
    if ((e as AnimationEvent).animationName === "shadeAutofillDetect") {
      console.log("[Shade] Autofill animation detected");
      setTimeout(() => handleValueChange(input), 100);
    }
  });
};

/**
 * Track an input field for value changes
 */
export const trackInput = (input: HTMLInputElement): void => {
  // Skip if already tracked
  if (trackedInputs.has(input)) {
    return;
  }

  trackedInputs.add(input);
  previousValues.set(input, input.value);

  // Mark that we're tracking this input
  input.dataset.shadeTracked = "true";

  // Setup autofill animation detection
  setupAutofillAnimation(input);

  // Listen for direct user input
  input.addEventListener("input", () => {
    input.dataset.shadeInputDetected = "true";
    handleValueChange(input);
  });

  // Listen for change events (fires on blur after value change)
  input.addEventListener("change", () => {
    handleValueChange(input);
  });

  // Listen for focus events (some password managers fill on focus)
  input.addEventListener("focus", () => {
    // Check value shortly after focus (for password manager popups)
    setTimeout(() => handleValueChange(input), 200);
  });

  // Listen for blur events (final check before user moves away)
  input.addEventListener("blur", () => {
    handleValueChange(input);
  });

  // Listen for paste events
  input.addEventListener("paste", () => {
    setTimeout(() => handleValueChange(input), 50);
  });

  // Check initial value (might be pre-filled)
  if (input.value) {
    handleValueChange(input);
  }

  console.log(
    "[Shade] Now tracking input field:",
    isPasswordField(input)
      ? "password"
      : isUsernameField(input)
        ? "username"
        : "other"
  );
};

/**
 * Start periodic tracking for all tracked inputs
 */
export const startTracking = (): void => {
  if (trackingIntervalId !== null) {
    return; // Already tracking
  }

  trackingIntervalId = window.setInterval(
    checkAllTrackedInputs,
    TRACK_INTERVAL
  );
  console.log("[Shade] Real-time field tracking started");
};

/**
 * Stop periodic tracking
 */
export const stopTracking = (): void => {
  if (trackingIntervalId !== null) {
    window.clearInterval(trackingIntervalId);
    trackingIntervalId = null;
    console.log("[Shade] Real-time field tracking stopped");
  }
};

/**
 * Scan and track all relevant input fields on the page
 */
export const scanAndTrackFields = (): void => {
  // Track all password fields
  const passwordFields = document.querySelectorAll<HTMLInputElement>(
    'input[type="password"]'
  );
  passwordFields.forEach(trackInput);

  // Track all potential username fields
  const textFields = document.querySelectorAll<HTMLInputElement>(
    'input[type="text"], input[type="email"], input:not([type])'
  );
  textFields.forEach((input) => {
    if (isUsernameField(input)) {
      trackInput(input);
    }
  });

  // Start the tracking interval if we have fields to track
  if (trackedInputs.size > 0) {
    startTracking();
  }
};

/**
 * Get current tracking status
 */
export const getTrackingStatus = (): {
  isActive: boolean;
  trackedCount: number;
  currentValues: { username?: string; password?: string };
} => {
  return {
    isActive: trackingIntervalId !== null,
    trackedCount: trackedInputs.size,
    currentValues: {
      username: formData["username"] || undefined,
      password: formData["password"] ? "***" : undefined,
    },
  };
};

/**
 * Force refresh all tracked values
 * Useful after page interactions that might fill fields
 */
export const forceRefreshValues = (): void => {
  console.log("[Shade] Force refreshing all tracked field values");
  trackedInputs.forEach((input) => {
    previousValues.set(input, ""); // Reset to force re-detection
    handleValueChange(input);
  });
};

/**
 * Clean up tracking for removed elements
 */
export const cleanupRemovedElements = (): void => {
  trackedInputs.forEach((input) => {
    if (!document.body.contains(input) && !isInShadowDOM(input)) {
      trackedInputs.delete(input);
      previousValues.delete(input);
    }
  });
};
