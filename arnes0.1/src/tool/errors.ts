// Small shared helpers. Port of miscellaneous utilities in the Go harness.

export function errMsg(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  }
  return String(e);
}
