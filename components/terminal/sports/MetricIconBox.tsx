import type { LucideIcon } from "lucide-react";

export default function MetricIconBox({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="gp-sports__metric-box">
      <Icon className="gp-sports__metric-box-icon h-4 w-4" strokeWidth={1.75} />
      <div className="gp-sports__metric-box-values">{value}</div>
      <div className="gp-sports__metric-box-label">{label}</div>
    </div>
  );
}
