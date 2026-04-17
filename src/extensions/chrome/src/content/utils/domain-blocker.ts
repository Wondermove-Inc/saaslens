/**
 * Domain Blocker - Checks and blocks blacklisted domains
 */

import {
  BlacklistDomain,
  BlockCheckResult,
  MessageType,
} from "../../shared/types";

/** Storage key for block page bypass (temporary) */
const BYPASS_STORAGE_KEY = "blockBypass";

/** Bypass duration in minutes */
const BYPASS_DURATION_MINUTES = 5;

/**
 * Check if current domain is blocked
 */
export async function checkCurrentDomain(): Promise<BlockCheckResult> {
  try {
    const domain = window.location.hostname;

    const response = await chrome.runtime.sendMessage({
      type: MessageType.CHECK_DOMAIN_BLOCKED,
      data: { domain },
    });

    if (response?.success && response.data) {
      return response.data as BlockCheckResult;
    }

    return { blocked: false };
  } catch (error) {
    console.error("Error checking domain block status:", error);
    return { blocked: false };
  }
}

/**
 * Check if bypass is active for current domain
 */
async function isBypassActive(): Promise<boolean> {
  try {
    const domain = window.location.hostname;
    const result = await chrome.storage.session.get(BYPASS_STORAGE_KEY);
    const bypasses = result[BYPASS_STORAGE_KEY] || {};

    if (bypasses[domain]) {
      const bypassTime = bypasses[domain] as number;
      const now = Date.now();
      const bypassDuration = BYPASS_DURATION_MINUTES * 60 * 1000;

      if (now - bypassTime < bypassDuration) {
        return true;
      }

      // Bypass expired, clean up
      delete bypasses[domain];
      await chrome.storage.session.set({ [BYPASS_STORAGE_KEY]: bypasses });
    }

    return false;
  } catch (error) {
    console.error("Error checking bypass status:", error);
    return false;
  }
}

/**
 * Show block page overlay
 */
function showBlockPage(blockedDomain: BlacklistDomain): void {
  // Create overlay container
  const overlay = document.createElement("div");
  overlay.id = "shade-block-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: white;
  `;

  // Block content
  overlay.innerHTML = `
    <div style="text-align: center; max-width: 500px; padding: 40px;">
      <div style="
        width: 80px;
        height: 80px;
        background: rgba(239, 68, 68, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
      ">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
      </div>

      <h1 style="font-size: 28px; font-weight: 600; margin: 0 0 12px;">
        Access Blocked
      </h1>

      <p style="font-size: 16px; color: #9ca3af; margin: 0 0 24px;">
        This website has been blocked by your organization's security policy.
      </p>

      <div style="
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 24px;
        text-align: left;
      ">
        <div style="margin-bottom: 12px;">
          <span style="font-size: 12px; color: #9ca3af; text-transform: uppercase;">Blocked Domain</span>
          <p style="font-size: 14px; font-family: monospace; margin: 4px 0 0; color: #f87171;">
            ${window.location.hostname}
          </p>
        </div>

        <div style="margin-bottom: 12px;">
          <span style="font-size: 12px; color: #9ca3af; text-transform: uppercase;">Policy Name</span>
          <p style="font-size: 14px; margin: 4px 0 0;">
            ${blockedDomain.name}
          </p>
        </div>

        ${
          blockedDomain.reason
            ? `
          <div>
            <span style="font-size: 12px; color: #9ca3af; text-transform: uppercase;">Reason</span>
            <p style="font-size: 14px; margin: 4px 0 0;">
              ${blockedDomain.reason}
            </p>
          </div>
        `
            : ""
        }
      </div>

      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="shade-go-back" style="
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        ">
          Go Back
        </button>
        <button id="shade-close-tab" style="
          background: transparent;
          color: #9ca3af;
          border: 1px solid #374151;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        ">
          Close Tab
        </button>
      </div>

      <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
        Protected by Shade SaaS Management
      </p>
    </div>
  `;

  // Add to document
  document.documentElement.appendChild(overlay);

  // Add event listeners
  const goBackButton = document.getElementById("shade-go-back");
  const closeTabButton = document.getElementById("shade-close-tab");

  if (goBackButton) {
    goBackButton.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    });
  }

  if (closeTabButton) {
    closeTabButton.addEventListener("click", () => {
      window.close();
    });
  }

  // Prevent page interaction
  document.body.style.overflow = "hidden";

  // Stop all scripts and media
  stopPageExecution();
}

/**
 * Stop page execution (scripts, media, etc.)
 */
function stopPageExecution(): void {
  // Stop all media elements
  document.querySelectorAll("video, audio").forEach((media) => {
    (media as HTMLMediaElement).pause();
    (media as HTMLMediaElement).src = "";
  });

  // Remove all scripts (won't affect already running ones, but prevents new ones)
  document.querySelectorAll("script").forEach((script) => {
    script.remove();
  });

  // Clear intervals and timeouts (best effort)
  const highestId = window.setTimeout(() => {}, 0);
  for (let i = 0; i < highestId; i++) {
    window.clearTimeout(i);
    window.clearInterval(i);
  }
}

/**
 * Initialize domain blocking check
 */
export async function initializeDomainBlocker(): Promise<void> {
  try {
    // Check if bypass is active
    const bypassActive = await isBypassActive();
    if (bypassActive) {
      return;
    }

    // Check if domain is blocked
    const result = await checkCurrentDomain();

    if (result.blocked && result.matchedDomain) {
      // Notify background script
      chrome.runtime.sendMessage({
        type: MessageType.DOMAIN_BLOCKED,
        data: {
          domain: window.location.hostname,
          url: window.location.href,
          blockedPattern: result.matchedDomain.pattern,
        },
      });

      // Show block page
      showBlockPage(result.matchedDomain);
    }
  } catch (error) {
    console.error("Error initializing domain blocker:", error);
  }
}
