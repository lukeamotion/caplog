// FILE: inputhelper.js
// DESCRIPTION: Contains utility functions for input processing and validation for the `contacts` API.

/**
 * Function I1: Infer Company Name
 * Infers a company name based on the email domain.
 * 
 * @param {string} email - The email address to infer from.
 * @returns {string|null} - The inferred company name, or null if no match.
 */
export function inferCompanyFromEmail(email) {
  const privateDomains = {
    'microsoft.com': 'Microsoft',
    'google.com': 'Google',
    'netflix.com': 'Netflix',
    'hulu.com': 'Hulu',
  };

  const domain = email?.split('@')[1]?.toLowerCase();
  return privateDomains[domain] || null;
}

/**
 * Function I2: Sanitize Phone
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
