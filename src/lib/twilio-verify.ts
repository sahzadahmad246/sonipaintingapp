import twilio from "twilio";

function normalizeMobile(mobile: string) {
  const trimmed = mobile.trim();
  const digits = trimmed.replace(/\D/g, "");
  let normalized = "";

  if (trimmed.startsWith("+")) {
    normalized = `+${digits}`;
  } else if (digits.length === 10) {
    normalized = `+91${digits}`;
  } else if (digits.length >= 8 && digits.length <= 15) {
    normalized = `+${digits}`;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("Invalid mobile number format");
  }

  return normalized;
}

function hasTwilioVerifyConfig() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID
  );
}

export async function sendOtpToMobile(mobile: string) {
  const formattedMobile = normalizeMobile(mobile);

  if (!hasTwilioVerifyConfig()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Twilio Verify is not configured");
    }
    return {
      sid: "dev-mode",
      status: "pending",
      channel: "sms",
      to: formattedMobile,
      devMode: true,
    };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const verification = await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID as string)
    .verifications.create({ to: formattedMobile, channel: "sms" });

  return {
    sid: verification.sid,
    status: verification.status,
    channel: verification.channel,
    to: formattedMobile,
    devMode: false,
  };
}

export async function verifyMobileOtp(mobile: string, code: string) {
  const formattedMobile = normalizeMobile(mobile);

  if (!hasTwilioVerifyConfig()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Twilio Verify is not configured");
    }

    return {
      approved: code === "000000",
      status: code === "000000" ? "approved" : "denied",
      to: formattedMobile,
      devMode: true,
    };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const check = await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID as string)
    .verificationChecks.create({ to: formattedMobile, code });

  return {
    approved: check.status === "approved",
    status: check.status,
    to: formattedMobile,
    devMode: false,
  };
}

export { normalizeMobile };
