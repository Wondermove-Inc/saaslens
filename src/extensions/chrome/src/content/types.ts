/**
 * Content script types and constants
 */

/** Debounce time to prevent duplicate submissions (ms) */
export const DEBOUNCE_TIME = 1000;

/** Wait time for potential MFA step (ms) */
export const MFA_WAIT_TIME = 8000;

/** Wait time for login success detection (ms) */
export const LOGIN_SUCCESS_WAIT_TIME = 5000;

/** Last sent login tracking data */
export interface LastSentLogin {
  domain: string;
  username: string;
  timestamp: number;
}

/** Pending login data for multi-step authentication */
export interface PendingLoginData {
  domain: string;
  username: string;
  password: string;
  timestamp: number;
  timeoutId?: number;
}

/** Form data storage type */
export type FormDataStorage = Record<string, string>;
