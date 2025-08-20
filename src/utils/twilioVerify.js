const dotenv = require('dotenv');

dotenv.config('../../.env');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioVerifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_ID;

const client = require('twilio')(accountSid, authToken);

const sendOTP = async (to) => {
  try {
    const response = client.verify.v2
      .services(twilioVerifyServiceSid)
      .verifications.create({ to, channel: 'sms' });
    console.log(
      `Twilio Verify - OTP requested to ${to}. Status: ${response.status}`,
    );
    return response;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

const verifyOTP = async (to, otp) => {
  try {
    const response = await client.verify.v2
      .services(twilioVerifyServiceSid)
      .verificationChecks.create({ to, code: otp });
    console.log(
      `Twilio Verify - OTP verification check for ${to} with code ${otp}. Status: ${response.status}`,
    );
    return response;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

module.exports = { sendOTP, verifyOTP };
