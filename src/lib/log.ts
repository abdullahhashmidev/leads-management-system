export function msg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}
export function log(scope: string, message: string, data?: unknown) {
  console.log(JSON.stringify({ t: new Date().toISOString(), scope, message, data }));
}
export function logError(scope: string, e: unknown) {
  console.error(JSON.stringify({ t: new Date().toISOString(), scope, error: msg(e) }));
}
