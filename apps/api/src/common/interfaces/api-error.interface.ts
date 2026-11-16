/** Error de un campo concreto (solo en 400 de validación). */
export interface FieldError {
  field: string;
  message: string;
}

/** Formato único de error de la API (ADR-0009). */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: FieldError[];
  };
}
