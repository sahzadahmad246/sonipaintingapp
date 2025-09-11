import { z } from "zod";

// Environment validation schema
const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  
  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  
  // Redis
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL"),
  REDIS_TOKEN: z.string().min(1, "REDIS_TOKEN is required"),
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  
  // Google APIs
  NEXT_PUBLIC_GOOGLE_API_KEY: z.string().min(1, "NEXT_PUBLIC_GOOGLE_API_KEY is required"),
  GOOGLE_PLACE_ID: z.string().min(1, "GOOGLE_PLACE_ID is required"),
  
  // Twilio (optional)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_QUOTATION_CREATED_SID: z.string().optional(),
  TWILIO_QUOTATION_ACCEPTED_SID: z.string().optional(),
  TWILIO_QUOTATION_REJECTED_SID: z.string().optional(),
  TWILIO_QUOTATION_UPDATED_SID: z.string().optional(),
  TWILIO_PAYMENT_RECEIVED_SID: z.string().optional(),
  TWILIO_PROJECT_UPDATED_SID: z.string().optional(),
  
  // Frontend
  NEXT_PUBLIC_FRONTEND_URL: z.string().url("NEXT_PUBLIC_FRONTEND_URL must be a valid URL"),
});

// Validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
