import type { LucideIcon } from "lucide-react";

export default function MetricIconBox({
  icon: Icon,
  title,
  value,
  hint,
  tooltip,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  hint: string;
  tooltip: string;
}) {
  return (
    <div className="gp-sports__metric-box" title={tooltip}>
      <Icon className="gp-sports__metric-box-icon h-4 w-4" strokeWidth={1.75} aria-hidden />
      <div className="gp-sports__metric-box-title">{title}</div>
      <div className="gp-sports__metric-box-values">{value}</div>
      <div className="gp-sports__metric-box-hint">{hint}</div>
    </div>
  );
}
