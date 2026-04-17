/**
 * Vitest Test Setup
 * Chrome Extension API Mocking
 */

import { beforeEach, vi } from "vitest";

// Web API Polyfills for JSDOM
import crypto from "crypto";
import { TextDecoder, TextEncoder } from "util";

// TextEncoder/TextDecoder polyfill
(global as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder =
  TextEncoder;
(global as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;

// crypto.subtle polyfill for SHA hashing
const cryptoSubtle = {
  digest: async (algorithm: string, data: Uint8Array): Promise<ArrayBuffer> => {
    const hashAlgorithm = algorithm.replace("-", "").toLowerCase();
    const hash = crypto.createHash(hashAlgorithm);
    hash.update(Buffer.from(data));
    return hash.digest().buffer;
  },
};

// Use Object.defineProperty to properly set crypto.subtle
Object.defineProperty(globalThis, "crypto", {
  value: {
    subtle: cryptoSubtle,
    getRandomValues: (arr: Uint8Array) => {
      return crypto.randomFillSync(arr);
    },
  },
  writable: true,
  configurable: true,
});

// Chrome API Mock
const chromeMock = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
    id: "mock-extension-id",
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
    session: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
    sendMessage: vi.fn(),
    onActivated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onRemoved: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  windows: {
    WINDOW_ID_NONE: -1,
    onFocusChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
  },
  webNavigation: {
    onCompleted: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onCommitted: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  scripting: {
    registerContentScripts: vi.fn(),
    unregisterContentScripts: vi.fn(),
    getRegisteredContentScripts: vi.fn(),
    executeScript: vi.fn(),
  },
};

// Global chrome object
(global as unknown as { chrome: typeof chromeMock }).chrome = chromeMock;

// Set default mock implementations
chromeMock.storage.session.get.mockResolvedValue({});
chromeMock.storage.session.set.mockResolvedValue(undefined);
chromeMock.storage.local.get.mockResolvedValue({});
chromeMock.storage.local.set.mockResolvedValue(undefined);
chromeMock.scripting.registerContentScripts.mockResolvedValue(undefined);
chromeMock.scripting.unregisterContentScripts.mockResolvedValue(undefined);
chromeMock.scripting.getRegisteredContentScripts.mockResolvedValue([]);
chromeMock.scripting.executeScript.mockResolvedValue([{ result: undefined }]);

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  // Re-apply default implementations after clearAllMocks
  chromeMock.storage.session.get.mockResolvedValue({});
  chromeMock.storage.session.set.mockResolvedValue(undefined);
  chromeMock.storage.local.get.mockResolvedValue({});
  chromeMock.storage.local.set.mockResolvedValue(undefined);
  chromeMock.scripting.registerContentScripts.mockResolvedValue(undefined);
  chromeMock.scripting.unregisterContentScripts.mockResolvedValue(undefined);
  chromeMock.scripting.getRegisteredContentScripts.mockResolvedValue([]);
  chromeMock.scripting.executeScript.mockResolvedValue([{ result: undefined }]);
  chromeMock.tabs.query.mockResolvedValue([]);
});

export { chromeMock };
