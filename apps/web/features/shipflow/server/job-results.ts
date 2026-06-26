export type ShipflowJobFailure = {
  ok: false;
  error: string;
  message?: string;
};

export type ShipflowJobSuccess<T extends Record<string, unknown> = Record<string, never>> = {
  ok: true;
} & T;

export function shipflowJobFailure(
  error: string,
  message?: string,
): ShipflowJobFailure {
  return message ? { ok: false, error, message } : { ok: false, error };
}

export function shipflowJobSuccess<T extends Record<string, unknown>>(
  data?: T,
): ShipflowJobSuccess<T> {
  return { ok: true, ...data } as ShipflowJobSuccess<T>;
}
