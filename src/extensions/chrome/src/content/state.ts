/**
 * Content script state management
 * Centralized state for form monitoring and login detection
 */

import { FormDataStorage, LastSentLogin, PendingLoginData } from "./types";

/** Store form data temporarily */
export let formData: FormDataStorage = {};

/** Detected password fields on the page */
export let passwordFields: HTMLInputElement[] = [];

/** Detected username fields on the page */
export let usernameFields: HTMLInputElement[] = [];

/** Detected MFA/TOTP fields on the page */
export let mfaFields: HTMLInputElement[] = [];

/** Whether MFA has been detected on current page */
export let hasMFADetected = false;

/** Type of MFA detected (e.g., 'TOTP') */
export let detectedMFAType = "";

/** Track last sent login to prevent duplicates */
export let lastSentLogin: LastSentLogin | null = null;

/** Pending login data for multi-step authentication */
export let pendingLoginData: PendingLoginData | null = null;

/** Track elements that already have event listeners */
export const monitoredElements = new WeakSet<Element>();

/** Reset all form-related state */
export const resetFormState = (): void => {
  formData = {};
  passwordFields = [];
  usernameFields = [];
  mfaFields = [];
  hasMFADetected = false;
  detectedMFAType = "";
};

/** Update form data */
export const setFormData = (key: string, value: string): void => {
  formData[key] = value;
};

/** Set MFA detection state */
export const setMFADetected = (detected: boolean, type: string): void => {
  hasMFADetected = detected;
  detectedMFAType = type;
};

/** Set last sent login */
export const setLastSentLogin = (login: LastSentLogin | null): void => {
  lastSentLogin = login;
};

/** Set pending login data */
export const setPendingLoginData = (data: PendingLoginData | null): void => {
  pendingLoginData = data;
};

/** Add a password field to tracking */
export const addPasswordField = (field: HTMLInputElement): void => {
  passwordFields.push(field);
};

/** Add a username field to tracking */
export const addUsernameField = (field: HTMLInputElement): void => {
  usernameFields.push(field);
};

/** Add an MFA field to tracking */
export const addMFAField = (field: HTMLInputElement): void => {
  mfaFields.push(field);
};
