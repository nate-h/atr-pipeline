import type { PropsWithChildren } from "react";

interface StatCardProps extends PropsWithChildren {
  label: string;
  value: string | number;
  tone?: "default" | "warn";
}

export function StatCard({
  label,
  value,
  tone = "default",
  children,
}: StatCardProps) {
  return (
    <section className={`card stat-card ${tone === "warn" ? "warn" : ""}`}>
      <p className="eyebrow">{label}</p>
      <h3>{value}</h3>
      {children ? <div className="muted">{children}</div> : null}
    </section>
  );
}
