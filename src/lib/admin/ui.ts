export const CAMPAIGN_LABEL: Record<string, string> = { accl: "Online Courses", summer_camp: "Summer Camp" };

export function money(n: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export function ago(iso: string | null): string {
  if (!iso) return "-";
  const diff = Date.now() - Date.parse(iso);
  const m = Math.round(Math.abs(diff) / 60000);
  const unit = m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
  return diff >= 0 ? `${unit} ago` : `in ${unit}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function waLink(phone: string, name?: string | null): string {
  let p = String(phone ?? "").replace(/\D/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  else if (p.startsWith("0")) p = "92" + p.slice(1);
  else if (p.length === 10 && p.startsWith("3")) p = "92" + p;
  const first = (name ?? "").trim().split(/\s+/)[0];
  const msg = first ? `Assalam o Alaikum ${first}, thank you for your interest in our academy. Is this a good time to talk about your free demo class?` : "";
  return `https://wa.me/${p}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}
