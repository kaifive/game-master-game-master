/**
 * Every error code the app can return. Features add codes here so the list
 * stays in one place (docs/conventions/engineering.md).
 */
const STATUS = {
  BAD_REQUEST: 400,
  NOT_SIGNED_IN: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof STATUS;

export const statusFor = (code: ErrorCode): number => STATUS[code];

/** A failure we expect. `message` is a plain sentence safe to show players. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Extra, player-safe facts for the response, such as which fields failed. */
  readonly details: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    options: { cause?: unknown; details?: Record<string, unknown> } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = statusFor(code);
    this.details = options.details ?? {};
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;
