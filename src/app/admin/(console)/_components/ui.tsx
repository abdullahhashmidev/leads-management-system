export function Temp({ value }: { value: string | null }) {
  if (!value) return <span className="chip">-</span>;
  return <span className={`chip t-${value}`}>{value === "hot" ? "🔥 " : ""}{value}</span>;
}

export function StatusChip({ value }: { value: string }) {
  return <span className={`chip s-${value}`}>{value.replace("_", " ")}</span>;
}
