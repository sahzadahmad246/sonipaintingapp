import { NextResponse } from "next/server";
import { logger } from "./logger";

// Define type for custom error with optional code
interface CustomError extends Error {
  code?: string;
}

export function handleError(error: unknown, message: string = "Server error", status: number = 500) {
  // Safely extract error details
  const errorDetails = error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    code: (error as CustomError).code,
  } : {
    message: String(error),
    stack: undefined,
    code: undefined,
  };

  // Log error with proper logging system
  logger.error(message, {
    error: errorDetails.message,
    code: errorDetails.code,
    status,
  }, error instanceof Error ? error : undefined);

  // Don't expose sensitive error details in production
  const responseDetails = process.env.NODE_ENV === "development" 
    ? errorDetails.message 
    : "An error occurred while processing your request";

  return NextResponse.json(
    { 
      error: message, 
      details: responseDetails,
      ...(process.env.NODE_ENV === "development" && { code: errorDetails.code })
    },
    { status }
  );
}