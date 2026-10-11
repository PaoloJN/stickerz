type IpEvent = { request: Request; getClientAddress?: () => string };

/** The caller's IP: first `x-forwarded-for` entry (Vercel sets it), else the adapter's address. */
export function clientIp(event: IpEvent): string {
  const first = event.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (first) return first;
  try {
    return event.getClientAddress?.() ?? "unknown";
  } catch {
    return "unknown";
  }
}
