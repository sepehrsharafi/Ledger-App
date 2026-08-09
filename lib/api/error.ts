/**
 * Transport-neutral error used by both the embedded repository and the HTTP client, so
 * callers (and the unassign-conflict flow) can branch on one type regardless of data source.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isConflict(): boolean {
    return this.status === 409;
  }
}
