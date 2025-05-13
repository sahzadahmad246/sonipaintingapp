import twilio, { Twilio } from "twilio";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { setTimeout } from "timers/promises";
import { Redis } from "@upstash/redis";

const client: Twilio = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

export type NotificationAction =
  | "quotation_created"
  | "quotation_accepted"
  | "quotation_rejected"
  | "quotation_updated"
  | "payment_received"
  | "project_updated";

const TEMPLATE_SIDS: Record<NotificationAction, string | undefined> = {
  quotation_created: process.env.TWILIO_QUOTATION_CREATED_SID,
  quotation_accepted: process.env.TWILIO_QUOTATION_ACCEPTED_SID,
  quotation_rejected: process.env.TWILIO_QUOTATION_REJECTED_SID,
  quotation_updated: process.env.TWILIO_QUOTATION_UPDATED_SID,
  payment_received: process.env.TWILIO_PAYMENT_RECEIVED_SID,
  project_updated: process.env.TWILIO_PROJECT_UPDATED_SID,
};

export async function sendNotification({
  to,
  message,
  action = "quotation_created",
  retries = 3,
  debounceSeconds = 5,
  templateVariables,
}: {
  to: string;
  message: string;
  action?: NotificationAction;
  retries?: number;
  debounceSeconds?: number;
  templateVariables?: Record<string, string>;
}): Promise<boolean> {
  const sanitizedNumber = to.replace(/\s+/g, "").replace(/[^+\d]/g, "");
  const phoneNumber = parsePhoneNumberFromString(sanitizedNumber, "IN");

  if (!phoneNumber || !phoneNumber.isValid()) {
    throw new Error(`Invalid phone number: ${sanitizedNumber}`);
  }

  const formattedNumber = phoneNumber.format("E.164");
  console.log("Attempting to send WhatsApp notification to:", formattedNumber, "Action:", action);

  const lockKey = `notification:${formattedNumber}:whatsapp:${action}`;
  const lock = await redis.get(lockKey);
  if (lock) {
    const ttl = await redis.ttl(lockKey);
    console.log(`Notification debounced for ${formattedNumber} (action: ${action}, TTL: ${ttl}s)`);
    return false;
  }

  const lastInteractionKey = `last_interaction:${formattedNumber}`;
  const lastInteraction = await redis.get(lastInteractionKey);
  const isWithinSessionWindow = lastInteraction
    ? (Date.now() - Number(lastInteraction)) / 1000 / 3600 < 24
    : false;

  const contentSid = TEMPLATE_SIDS[action];

  for (let i = 0; i < retries; i++) {
    try {
      const messageOptions: {
        from: string;
        to: string;
        body?: string;
        contentSid?: string;
        contentVariables?: string;
      } = {
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${formattedNumber}`,
      };

      if (isWithinSessionWindow) {
        messageOptions.body = message;
      } else if (contentSid && templateVariables) {
        messageOptions.contentSid = contentSid;
        messageOptions.contentVariables = JSON.stringify(templateVariables);
      } else {
        throw new Error(`No template configured for action '${action}' or missing template variables`);
      }

      const messageInstance = await client.messages.create(messageOptions);
      await redis.set(lockKey, "locked", { ex: debounceSeconds });
      console.log(
        `WhatsApp notification sent to ${formattedNumber} (action: ${action}, SID: ${messageInstance.sid})`
      );
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("63016")) {
        console.error(
          `Error 63016: Freeform message blocked for ${formattedNumber}. Ensure template for '${action}' is used.`
        );
      }
      if (i === retries - 1) {
        console.error(
          `Failed to send WhatsApp notification to ${formattedNumber} (action: ${action}):`,
          errorMessage
        );
        throw new Error(`Failed to send WhatsApp notification: ${errorMessage}`);
      }
      await setTimeout(1000 * Math.pow(2, i));
    }
  }
  return false;
}