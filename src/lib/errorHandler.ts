import { NextResponse } from "next/server";

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

  console.error(`${message}:`, errorDetails);
  return NextResponse.json(
    { error: message, details: errorDetails.message, code: errorDetails.code },
    { status }
  );
}