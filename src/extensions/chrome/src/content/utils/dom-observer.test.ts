/**
 * DOM Observer Tests
 */

import { vi } from "vitest";
import { observeDOMChanges } from "./dom-observer";

// TODO (v0.1.1): file-level skip due to jsdom MutationObserver limitation
describe.skip("DOM Observer", () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = "";
  });

  describe("observeDOMChanges", () => {
    it("should call callback when nodes are added", async () => {
      const callback = vi.fn();
      observeDOMChanges(callback);

      // Add a new element
      const div = document.createElement("div");
      document.body.appendChild(div);

      // Wait for MutationObserver to trigger
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalled();
    });

    it("should call callback when form is added", async () => {
      const callback = vi.fn();
      observeDOMChanges(callback);

      // Add a form
      const form = document.createElement("form");
      document.body.appendChild(form);

      // Wait for MutationObserver to trigger
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalled();
    });

    it("should call callback when deeply nested element is added", async () => {
      const callback = vi.fn();
      observeDOMChanges(callback);

      // Create nested structure
      const container = document.createElement("div");
      document.body.appendChild(container);

      // Wait for first mutation
      await new Promise((resolve) => setTimeout(resolve, 0));
      callback.mockClear();

      // Add nested element
      const nested = document.createElement("form");
      container.appendChild(nested);

      // Wait for MutationObserver to trigger
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalled();
    });

    it("should not call callback when no nodes are added", async () => {
      const callback = vi.fn();
      observeDOMChanges(callback);

      // Just wait without adding anything
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
