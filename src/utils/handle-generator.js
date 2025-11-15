/**
 * Generate handle from phone number
 * @param {string} phone - The phone number
 * @returns {string} Handle in format @phonenumber (digits only)
 */
export function generateHandleFromPhone(phone) {
  if (!phone) return null;
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  return `@${digitsOnly}`;
}

/**
 * Generate handle from email
 * @param {string} email - The email address
 * @returns {string} Handle in format @emailprefix (part before @)
 */
export function generateHandleFromEmail(email) {
  if (!email) return null;
  // Extract part before @ symbol
  const emailPrefix = email.split('@')[0];
  return `@${emailPrefix}`;
}
