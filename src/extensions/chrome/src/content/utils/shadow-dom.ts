/**
 * Shadow DOM traversal utilities
 * Enables form detection in Shadow DOM encapsulated components
 * (Salesforce, ServiceNow, some enterprise SaaS)
 */

/**
 * Recursively find all shadow roots in the document
 */
export const findAllShadowRoots = (
  root: Element | Document = document
): ShadowRoot[] => {
  const shadowRoots: ShadowRoot[] = [];

  const traverse = (node: Element | Document): void => {
    // Check if current node has a shadow root
    if (node instanceof Element && node.shadowRoot) {
      shadowRoots.push(node.shadowRoot);
      // Continue traversing inside the shadow root
      traverseChildren(node.shadowRoot);
    }

    // Traverse children
    traverseChildren(node);
  };

  const traverseChildren = (node: Element | Document | ShadowRoot): void => {
    const children =
      node instanceof Document ? node.body?.children : node.children;

    if (children) {
      for (const child of Array.from(children)) {
        traverse(child);
      }
    }
  };

  traverse(root);
  return shadowRoots;
};

/**
 * Query selector that works across shadow boundaries
 * @param visited - Set to track visited shadow roots and prevent infinite recursion
 */
export const deepQuerySelector = <T extends Element>(
  selector: string,
  root: Element | Document | ShadowRoot = document,
  visited: Set<ShadowRoot> = new Set()
): T | null => {
  // First try the regular querySelector
  const result = root.querySelector<T>(selector);
  if (result) return result;

  // Search in shadow roots
  const shadowRoots =
    root instanceof Document
      ? findAllShadowRoots(root)
      : root instanceof ShadowRoot
        ? findAllShadowRoots(root.host)
        : findAllShadowRoots(root);

  for (const shadowRoot of shadowRoots) {
    // Skip already visited shadow roots to prevent infinite recursion
    if (visited.has(shadowRoot)) continue;
    visited.add(shadowRoot);

    const shadowResult = shadowRoot.querySelector<T>(selector);
    if (shadowResult) return shadowResult;

    // Recursively search nested shadow roots (pass visited set)
    const nestedResult = deepQuerySelector<T>(selector, shadowRoot, visited);
    if (nestedResult) return nestedResult;
  }

  return null;
};

/**
 * Query selector all that works across shadow boundaries
 * @param visited - Set to track visited shadow roots and prevent infinite recursion
 */
export const deepQuerySelectorAll = <T extends Element>(
  selector: string,
  root: Element | Document | ShadowRoot = document,
  visited: Set<ShadowRoot> = new Set()
): T[] => {
  const results: T[] = [];

  // Get results from regular DOM
  const regularResults = root.querySelectorAll<T>(selector);
  results.push(...Array.from(regularResults));

  // Search in shadow roots
  const shadowRoots =
    root instanceof Document
      ? findAllShadowRoots(root)
      : root instanceof ShadowRoot
        ? findAllShadowRoots(root.host)
        : findAllShadowRoots(root);

  for (const shadowRoot of shadowRoots) {
    // Skip already visited shadow roots to prevent infinite recursion
    if (visited.has(shadowRoot)) continue;
    visited.add(shadowRoot);

    const shadowResults = shadowRoot.querySelectorAll<T>(selector);
    results.push(...Array.from(shadowResults));

    // Recursively search nested shadow roots (pass visited set)
    const nestedResults = deepQuerySelectorAll<T>(
      selector,
      shadowRoot,
      visited
    );
    results.push(...nestedResults);
  }

  return results;
};

/**
 * Find all input fields including those in shadow DOM
 */
export const findAllInputs = (): HTMLInputElement[] => {
  return deepQuerySelectorAll<HTMLInputElement>("input");
};

/**
 * Find all forms including those in shadow DOM
 */
export const findAllForms = (): HTMLFormElement[] => {
  return deepQuerySelectorAll<HTMLFormElement>("form");
};

/**
 * Find all password fields including those in shadow DOM
 */
export const findAllPasswordFields = (): HTMLInputElement[] => {
  return deepQuerySelectorAll<HTMLInputElement>('input[type="password"]');
};

/**
 * Find all buttons including those in shadow DOM
 */
export const findAllButtons = (): Element[] => {
  return deepQuerySelectorAll<Element>(
    'button, input[type="submit"], input[type="button"]'
  );
};

/**
 * Observe shadow DOM additions for dynamic content
 */
export const observeShadowDOMChanges = (
  callback: () => void
): MutationObserver => {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof Element) {
          // Check if added element has shadow root
          if (node.shadowRoot) {
            console.log("[Shade] New shadow root detected");
            callback();
            return;
          }

          // Check if any children have shadow roots
          const shadowRoots = findAllShadowRoots(node);
          if (shadowRoots.length > 0) {
            console.log(
              "[Shade] Shadow roots found in added content:",
              shadowRoots.length
            );
            callback();
            return;
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
};

/**
 * Check if page uses Shadow DOM for login forms
 */
export const hasShadowDOMLoginForms = (): boolean => {
  const shadowRoots = findAllShadowRoots();

  for (const shadowRoot of shadowRoots) {
    const hasPasswordField = shadowRoot.querySelector('input[type="password"]');
    const hasForm = shadowRoot.querySelector("form");
    const hasEmailField = shadowRoot.querySelector('input[type="email"]');

    if (hasPasswordField || hasForm || hasEmailField) {
      console.log("[Shade] Shadow DOM login form detected");
      return true;
    }
  }

  return false;
};
