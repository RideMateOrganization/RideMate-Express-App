/**
 * Database Configuration Utility
 *
 * Provides environment-specific database configuration for MongoDB Atlas.
 * Uses the same cluster URL but different database names per environment.
 */

/**
 * Get the current environment (development, staging, or production)
 * @returns {string} The current environment
 */
function getEnvironment() {
  const env = process.env.NODE_ENV || 'development';
  return env.toLowerCase();
}

/**
 * Get the MongoDB cluster URI (without database name)
 * @returns {string} The cluster connection string
 * @throws {Error} If MONGO_URI is not set
 */
export function getClusterUri() {
  const clusterUri = process.env.MONGO_URI;

  if (!clusterUri) {
    throw new Error(
      'MONGO_URI environment variable is not set. ' +
        'Please set it to your MongoDB Atlas cluster connection string (without database name).',
    );
  }

  return clusterUri;
}

/**
 * Get the database name for the current environment
 * @returns {string} The database name
 */
export function getDatabaseName() {
  const env = getEnvironment();

  let dbName;
  switch (env) {
    case 'production':
    case 'prod':
      dbName = process.env.MONGO_DB_NAME_PRODUCTION || 'ridemate-prod';
      break;
    case 'staging':
      dbName = process.env.MONGO_DB_NAME_STAGING || 'ridemate-staging';
      break;
    case 'development':
    case 'dev':
    default:
      dbName = process.env.MONGO_DB_NAME_DEVELOPMENT || 'ridemate-dev';
      break;
  }

  return dbName;
}

/**
 * Get the full MongoDB connection URI with database name
 * Used for Mongoose connections
 * @returns {string} The full connection string with database name
 */
export function getDatabaseUri() {
  const clusterUri = getClusterUri();
  const dbName = getDatabaseName();
  const url = new URL(clusterUri);
  url.pathname = `/${dbName}`;
  return url.toString();
}
