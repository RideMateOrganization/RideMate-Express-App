import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config('../../.env');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_VIRTUAL_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

async function sendOTP(to, code) {
  try {
    const response = client.messages.create({
      body: `Your OTP is ${code}`,
      from: twilioPhoneNumber,
      to,
    });
    return response;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
}

export default sendOTP;
