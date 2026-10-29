export class HttpError extends Error {
  public statusCode: number
  public errorName: string
  public details?: unknown

  constructor(statusCode: number, errorName: string, message: string, details?: unknown) {
    super(message)
    this.name = errorName
    this.statusCode = statusCode
    this.errorName = errorName
    this.details = details
  }
}

export class ExternalApiError extends HttpError {
  constructor(message = 'Failed to fetch exchange rates') {
    super(502, 'ExternalApiError', message)
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Validation error', details?: unknown) {
    super(400, 'ValidationError', message, details)
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Invalid or missing token') {
    super(401, 'Unauthorized', message)
  }
}
