// FILE: inputhelper.js
// DESCRIPTION: Contains utility functions for input validation and sanitization for the `companies` API.

/**
 * Function I1: Sanitize Phone
 * Formats a phone number to `XXX.XXX.XXXX` format.
 * 
 * @param {string} phone - The phone number to sanitize.
 * @returns {string} - The sanitized phone number.
 * @throws {Error} - If the phone number is invalid.
 */
export function sanitizePhone(phone) {
  const digits = phone?.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  throw new Error('Invalid phone number format. Expected: XXX.XXX.XXXX');
}
