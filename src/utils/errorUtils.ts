/**
 * Standardized Workspace Error Utilities
 * Provides normalized error extraction and domain-specific error classes.
 */

export class SchemaValidationError extends Error {
  public readonly storeName?: string;
  public readonly index?: number;
  public readonly field?: string;

  constructor(
    message: string,
    storeName?: string,
    index?: number,
    field?: string
  ) {
    super(message);
    this.name = 'SchemaValidationError';
    this.storeName = storeName;
    this.index = index;
    this.field = field;
    Object.setPrototypeOf(this, SchemaValidationError.prototype);
  }
}

/**
 * Normalizes any caught unknown value into a guaranteed standard Error instance.
 */
export function normalizeError(err: unknown): Error {
  if (err instanceof Error) {
    return err;
  }
  if (typeof err === 'string') {
    return new Error(err);
  }
  if (err && typeof err === 'object') {
    if ('message' in err && typeof (err as any).message === 'string') {
      const e = new Error((err as any).message);
      if ('name' in err && typeof (err as any).name === 'string') {
        e.name = (err as any).name;
      }
      return e;
    }
    try {
      return new Error(JSON.stringify(err));
    } catch {
      return new Error(String(err));
    }
  }
  return new Error('An unexpected error occurred');
}

/**
 * Extracts a human-readable error message string safely from any unknown caught value.
 */
export function getErrorMessage(err: unknown): string {
  return normalizeError(err).message;
}
