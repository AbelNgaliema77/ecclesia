export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = DomainError> = Ok<T> | Err<E>;

export type DomainError = {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
};

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

export const err = <E = DomainError>(error: E): Err<E> => ({ ok: false, error });

export const domainError = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
): DomainError => (details ? { code, message, details } : { code, message });
