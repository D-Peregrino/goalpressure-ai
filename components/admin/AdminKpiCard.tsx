export default function AdminKpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="gp-admin-kpi">
      <p className="gp-admin-kpi__label">{label}</p>
      <p className="gp-admin-kpi__value tabular-nums">{value}</p>
      {sub && <p className="gp-admin-kpi__sub">{sub}</p>}
    </div>
  );
}
