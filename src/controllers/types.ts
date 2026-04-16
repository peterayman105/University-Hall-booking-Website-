export type ActionSuccess<T> = {
  ok: true;
  status?: number;
  data: T;
  setAuthToken?: string;
};

export type ActionFailure = {
  ok: false;
  status: number;
  error: string;
};

export type ActionResult<T = unknown> = ActionSuccess<T> | ActionFailure;

export function fail(status: number, error: string): ActionFailure {
  return { ok: false, status, error };
}

export function ok<T>(data: T, status = 200, setAuthToken?: string): ActionSuccess<T> {
  return { ok: true, status, data, setAuthToken };
}
