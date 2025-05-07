import twilio from "twilio";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { setTimeout } from "timers/promises";
import { Redis } from "@upstash/redis";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

export async function sendNotification({
  to,
  message,
  action = "default",
  retries = 3,
  debounceSeconds = 20,
}: {
  to: string;
  message: string;
  action?: string;
  retries?: number;
  debounceSeconds?: number;
}) {
  // Sanitize input: remove spaces and non-digit characters except +
  const sanitizedNumber = to.replace(/\s+/g, "").replace(/[^+\d]/g, "");
  const phoneNumber = parsePhoneNumberFromString(sanitizedNumber, "IN");

  if (!phoneNumber || !phoneNumber.isValid()) {
    throw new Error(`Invalid phone number: ${sanitizedNumber}`);
  }

  // Use E.164 format (e.g., +917355109388)
  const formattedNumber = phoneNumber.format("E.164");
  console.log("Attempting to send WhatsApp notification to:", formattedNumber, "Action:", action);

  // Use action-specific lock key
  const lockKey = `notification:${formattedNumber}:whatsapp:${action}`;
  const lock = await redis.get(lockKey);
  if (lock) {
    const ttl = await redis.ttl(lockKey);
    console.log(`Notification debounced for ${formattedNumber} (action: ${action}, TTL: ${ttl}s)`);
    return false;
  }

  for (let i = 0; i < retries; i++) {
    try {
      await client.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${formattedNumber}`,
      });
      await redis.set(lockKey, "locked", { ex: debounceSeconds });
      console.log(`WhatsApp notification sent to ${formattedNumber} (action: ${action})`);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (i === retries - 1) {
        console.error(`Failed to send WhatsApp notification to ${formattedNumber} (action: ${action}):`, errorMessage);
        throw new Error(`Failed to send WhatsApp notification: ${errorMessage}`);
      }
      await setTimeout(1000 * Math.pow(2, i));
    }
  }
  return false;
}