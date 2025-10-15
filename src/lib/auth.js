import { betterAuth } from 'better-auth';
import { MongoClient } from 'mongodb';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { expo } from '@better-auth/expo';
import { phoneNumber } from 'better-auth/plugins';

import dotenv from 'dotenv';

import sendOTP from '../utils/twilio-verify.js';
import { UserProfile } from '../models/user.js';

dotenv.config({ path: './.env' });

const client = new MongoClient(process.env.MONGO_URI);
const db = client.db();

const auth = betterAuth({
  database: mongodbAdapter(db, { client }),
  trustedOrigins: ['ridematefe:///'],
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
            const database = client.db();
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
        getTempEmail: (number) => `${number}@ridematefe.com`,
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
            const mongoUser = new UserProfile({
              authId: user.id,
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
