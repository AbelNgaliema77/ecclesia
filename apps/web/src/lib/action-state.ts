export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export type ActionState<T = undefined> =
  | { readonly status: "idle" }
  | { readonly status: "success"; readonly data: T }
  | { readonly status: "error"; readonly code: string; readonly fieldErrors?: FieldErrors };

export const idleState: ActionState<never> = { status: "idle" };
