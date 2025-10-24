import Ride from '../models/ride.js';

/**
 * Generates a unique 6-digit alphanumeric ride code
 * Uses characters A-Z and 2-9 (excluding O, 0, I, 1 for better UX)
 * @returns {Promise<string>} A unique 6-character ride code
 * @throws {Error} If unable to generate unique code after max attempts
 */
async function generateUniqueRideCode() {
  // Character set excluding ambiguous characters (O, 0, I, 1)
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codeLength = 6;
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    // Generate random code
    let code = '';
    for (let i = 0; i < codeLength; i += 1) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if code already exists
    // eslint-disable-next-line no-await-in-loop
    const existingRide = await Ride.findOne({ rideId: code });
    if (!existingRide) {
      return code;
    }

    console.warn(
      `Ride code collision detected: ${code} (attempt ${attempt}/${maxAttempts})`,
    );
  }

  throw new Error(
    `Unable to generate unique ride code after ${maxAttempts} attempts. Please try again.`,
  );
}

export default generateUniqueRideCode;
