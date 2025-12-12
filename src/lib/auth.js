import { betterAuth } from 'better-auth';
import { MongoClient } from 'mongodb';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { expo } from '@better-auth/expo';
import { phoneNumber } from 'better-auth/plugins';

import dotenv from 'dotenv';

import sendOTP from '../utils/twilio-verify.js';
import {
  generateHandleFromPhone,
  generateHandleFromEmail,
} from '../utils/handle-generator.js';
import { UserProfile } from '../models/user.js';
import { getClusterUri, getDatabaseName } from '../config/database.js';
import { connectDB } from '../config/db.js';

dotenv.config({ path: './.env' });

const client = new MongoClient(getClusterUri());
const db = client.db(getDatabaseName());

const auth = betterAuth({
  advanced: {
    cookies: {
      state: {
        attributes: {
          sameSite: 'none',
          secure: true,
        },
      },
    },
  },
  database: mongodbAdapter(db, { client }),
  trustedOrigins: [
    'ridematefe://',
    'https://ridemate-prod.up.railway.app',
    // Development mode - Expo's exp:// scheme with local IP ranges
    ...(process.env.NODE_ENV === 'development'
      ? [
          'exp://*/*', // Trust all Expo development URLs
          'exp://10.0.0.*:*/*', // Trust 10.0.0.x IP range
          'exp://192.168.*.*:*/*', // Trust 192.168.x.x IP range
          'exp://172.*.*.*:*/*', // Trust 172.x.x.x IP range
          'exp://localhost:*/*', // Trust localhost
        ]
      : []),
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [
    expo(),
    phoneNumber({
      allowedAttempts: 3,
      otpLength: 6,
      otpExpiry: 5 * 60, // 5 minutes
      generateOTP: ({ phoneNumber: number }) => {
        if (number === process.env.TESTING_PHONE_NUMBER)
          return process.env.TESTING_OTP;
        return Math.floor(100000 + Math.random() * 900000).toString();
      },
      sendOTP: async ({ phoneNumber: number, code }) => {
        if (number === process.env.TESTING_PHONE_NUMBER) {
          try {
            const database = client.db(getDatabaseName());
            const verificationCollection = database.collection('verification');
            await verificationCollection.updateOne(
              {
                identifier: number,
                expiresAt: { $gt: new Date() },
              },
              {
                $set: {
                  value: `${process.env.TESTING_OTP}:0`,
                  updatedAt: new Date(),
                },
              },
            );
          } catch (error) {
            console.error('Error updating testing OTP in database:', error);
          }
          return Promise.resolve();
        }
        return sendOTP(number, code);
      },
      signUpOnVerification: {
        getTempEmail: (number) => `${number}@ridemate.com`,
        getTempName: (number) => `Rider ${number}`,
      },
      requireVerification: true,
    }),
  ],
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await connectDB();
            let handle = null;
            if (user.phoneNumber) {
              handle = generateHandleFromPhone(user.phoneNumber);
            } else if (user.email) {
              handle = generateHandleFromEmail(user.email);
            }

            const mongoUser = new UserProfile({
              authId: user.id,
              ...(handle && { handle }),
            });

            await mongoUser.save();
          } catch (error) {
            console.error('Error creating MongoDB user:', error);
          }
        },
      },
    },
  },
});

export default auth;
