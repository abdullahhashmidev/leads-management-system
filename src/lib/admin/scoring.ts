// Scoring rules (formerly mirrored from the n8n workflow). Single place to change the thresholds in the UI.
export const HOT_AT = 80;
export const COLD_BELOW = 50;

export type Part = { label: string; points: number };

export function breakdown(l: { role: string | null; campaign: string; intent: string | null }): { parts: Part[]; total: number } {
  const parts: Part[] = [{ label: "Base score", points: 50 }];
  const role = l.role ?? "parent";
  if (role === "student" || role === "professional") parts.push({ label: `Role: ${role}`, points: 20 });
  if (role === "entrepreneur") parts.push({ label: "Role: entrepreneur", points: 30 });
  if (l.campaign === "accl") parts.push({ label: "Campaign: Online Courses", points: 10 });
  if (l.intent === "high") parts.push({ label: "Chat intent: high", points: 15 });
  else if (l.intent === "medium") parts.push({ label: "Chat intent: medium", points: 5 });
  const total = Math.min(100, parts.reduce((a, p) => a + p.points, 0));
  return { parts, total };
}
