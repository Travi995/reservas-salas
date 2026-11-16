/** Error for a specific field (only in validation 400s). */
export interface FieldError {
  field: string;
  message: string;
}

/** Unified API error format (ADR-0009). */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: FieldError[];
  };
}
