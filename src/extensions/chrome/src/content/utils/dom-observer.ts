/**
 * DOM mutation observer
 * Monitors for dynamically added forms and login fields
 * Enhanced for 2-step login flows (Google, Slack, etc.)
 */

/** Debounce timeout for scan operations */
let scanTimeout: ReturnType<typeof setTimeout> | null = null;
const SCAN_DEBOUNCE_MS = 300;

/**
 * Check if an element or its children contain login-related fields
 */
const containsLoginFields = (element: Node): boolean => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  // Check for form elements
  if (element.tagName === "FORM") {
    return true;
  }

  // Check for password inputs
  if (element.tagName === "INPUT") {
    const input = element as HTMLInputElement;
    const type = input.type?.toLowerCase();
    const autocomplete = input.autocomplete?.toLowerCase() || "";

    if (
      type === "password" ||
      type === "email" ||
      autocomplete.includes("password") ||
      autocomplete.includes("username")
    ) {
      return true;
    }
  }

  // Check children for login fields
  const hasForm = element.querySelector("form");
  const hasPasswordField = element.querySelector('input[type="password"]');
  const hasEmailField = element.querySelector('input[type="email"]');
  const hasUsernameField = element.querySelector(
    'input[autocomplete*="username"]'
  );
  const hasPasswordAutocomplete = element.querySelector(
    'input[autocomplete*="password"]'
  );

  return !!(
    hasForm ||
    hasPasswordField ||
    hasEmailField ||
    hasUsernameField ||
    hasPasswordAutocomplete
  );
};

/**
 * Monitor DOM changes to detect dynamically added forms
 * Optimized with debounce and smart filtering
 */
export const observeDOMChanges = (onFormDetected: () => void): void => {
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;

    for (const mutation of mutations) {
      // Check added nodes for login-related elements
      for (const node of Array.from(mutation.addedNodes)) {
        if (containsLoginFields(node)) {
          shouldScan = true;
          console.log("[Shade] Detected dynamic login field addition");
          break;
        }
      }

      // Also check for attribute changes on inputs (e.g., type change from hidden to password)
      if (
        mutation.type === "attributes" &&
        mutation.target instanceof HTMLInputElement
      ) {
        const input = mutation.target;
        if (
          mutation.attributeName === "type" ||
          mutation.attributeName === "style" ||
          mutation.attributeName === "class" ||
          mutation.attributeName === "hidden"
        ) {
          // Input visibility or type might have changed
          shouldScan = true;
          console.log(
            "[Shade] Detected input attribute change:",
            mutation.attributeName
          );
          break;
        }
      }

      if (shouldScan) break;
    }

    // Debounced scan to avoid multiple rapid calls
    if (shouldScan) {
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
      scanTimeout = setTimeout(() => {
        console.log("[Shade] Running debounced form scan");
        onFormDetected();
        scanTimeout = null;
      }, SCAN_DEBOUNCE_MS);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["type", "style", "class", "hidden", "aria-hidden"],
  });

  console.log("[Shade] DOM observer initialized with enhanced detection");
};

/**
 * Observe visibility changes for hidden password fields
 * Some sites reveal password fields after username entry
 */
export const observeVisibilityChanges = (callback: () => void): void => {
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target instanceof HTMLInputElement) {
          const input = entry.target;
          if (input.type === "password") {
            console.log("[Shade] Password field became visible");
            callback();
          }
        }
      });
    },
    { threshold: 0.1 }
  );

  // Observe all password inputs
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    intersectionObserver.observe(input);
  });

  // Re-observe when new password fields are added
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          const passwordFields = node.querySelectorAll(
            'input[type="password"]'
          );
          passwordFields.forEach((input) => {
            intersectionObserver.observe(input);
          });
          if (node instanceof HTMLInputElement && node.type === "password") {
            intersectionObserver.observe(node);
          }
        }
      });
    });
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
};
