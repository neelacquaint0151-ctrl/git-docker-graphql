import { redis } from '../../config/redis.js';
import { sendSMSViaHttpSMS } from '../../services/sms.service.js';

export const authResolver = {
  Mutation: {
    sendOTP: async (_, { phone }) => {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const redisKey = `otp:${phone}`;

      await redis.set(redisKey, otpCode, 'EX', 300);
      console.log(`🔑 OTP generated for ${phone}: ${otpCode}`);

      try {
        await sendSMSViaHttpSMS(
          phone,
          `Your verification code is: ${otpCode}. Valid for 5 minutes.`
        );
        return {
          success: true,
          message: `OTP sent successfully to ${phone}`,
        };
      } catch (error) {
        console.error('HttpSMS Error:', error.message);
        return {
          success: false,
          message: `Failed to dispatch SMS: ${error.message}`,
        };
      }
    },

    verifyOTP: async (_, { phone, code }) => {
      const redisKey = `otp:${phone}`;
      const storedOTP = await redis.get(redisKey);

      if (!storedOTP) {
        return {
          success: false,
          message: 'OTP has expired or was never requested.',
        };
      }

      if (storedOTP !== code) {
        return {
          success: false,
          message: 'Invalid OTP code. Please try again.',
        };
      }

      // Delete OTP to prevent reuse
      await redis.del(redisKey);

      // PUBLISH EVENT TO REDIS STREAM: Decoupled Inter-Service Messaging
      await redis.xadd(
        'auth-events',
        '*',
        'event', 'USER_VERIFIED',
        'phone', phone,
        'timestamp', Date.now().toString()
      );
      console.log(`📡 [Redis Stream] Published USER_VERIFIED event for phone: ${phone}`);

      return {
        success: true,
        message: 'Phone number verified successfully!',
      };
    },
  },
};