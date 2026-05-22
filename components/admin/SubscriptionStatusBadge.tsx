const STATUS_LABELS: Record<string, string> = {
  trialing: "Trial",
  active: "Ativo",
  past_due: "Vencido",
  canceled: "Cancelado",
  incomplete: "Incompleto",
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Estornado",
};

const STATUS_CLASS: Record<string, string> = {
  trialing: "gp-sub-badge--trial",
  active: "gp-sub-badge--active",
  past_due: "gp-sub-badge--warn",
  canceled: "gp-sub-badge--muted",
  incomplete: "gp-sub-badge--muted",
  pending: "gp-sub-badge--muted",
  paid: "gp-sub-badge--active",
  failed: "gp-sub-badge--warn",
  refunded: "gp-sub-badge--muted",
};

export default function SubscriptionStatusBadge({ status }: { status?: string }) {
  const key = status ?? "active";
  const label = STATUS_LABELS[key] ?? key;
  const cls = STATUS_CLASS[key] ?? "gp-sub-badge--muted";
  return <span className={`gp-sub-badge ${cls}`}>{label}</span>;
}
