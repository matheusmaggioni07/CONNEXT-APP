export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
  ) {
    super(message)
    this.name = "APIError"
  }
}

export function createErrorResponse(statusCode: number, message: string, code?: string, details?: Record<string, any>) {
  return {
    error: message,
    code: code || "UNKNOWN_ERROR",
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  }
}

export function handleAPIError(error: unknown, defaultMessage = "Internal server error") {
  console.error("[Error]", error)

  if (error instanceof APIError) {
    return {
      statusCode: error.statusCode,
      body: createErrorResponse(error.statusCode, error.message, error.code),
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("RLS")) {
      return {
        statusCode: 403,
        body: createErrorResponse(403, "Access denied", "RLS_VIOLATION"),
      }
    }

    if (error.message.includes("not found")) {
      return {
        statusCode: 404,
        body: createErrorResponse(404, "Resource not found", "NOT_FOUND"),
      }
    }

    if (error.message.includes("unique constraint")) {
      return {
        statusCode: 409,
        body: createErrorResponse(409, "Resource already exists", "CONFLICT"),
      }
    }
  }

  return {
    statusCode: 500,
    body: createErrorResponse(500, defaultMessage, "INTERNAL_ERROR"),
  }
}
