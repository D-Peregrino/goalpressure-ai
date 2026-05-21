export type SportmonksErrorCode =
  | "MISSING_TOKEN"
  | "HTTP_ERROR"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "EMPTY_RESPONSE"
  | "INVALID_PAYLOAD"
  | "NETWORK_ERROR";

export class SportmonksServiceError extends Error {
  readonly code: SportmonksErrorCode;
  readonly statusCode?: number;
  readonly details?: unknown;

  constructor(
    code: SportmonksErrorCode,
    message: string,
    options?: { statusCode?: number; details?: unknown; cause?: unknown }
  ) {
    super(message, { cause: options?.cause });
    this.name = "SportmonksServiceError";
    this.code = code;
    this.statusCode = options?.statusCode;
    this.details = options?.details;
  }
}

export function isSportmonksServiceError(
  error: unknown
): error is SportmonksServiceError {
  return error instanceof SportmonksServiceError;
}
