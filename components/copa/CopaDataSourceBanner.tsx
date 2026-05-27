import type { CopaDataset } from "@/lib/copa/types";

export default function CopaDataSourceBanner({ data }: { data: CopaDataset }) {
  if (data.source === "sportmonks") return null;

  return (
    <div
      className="gp-copa-premium-note"
      role="alert"
      style={{
        marginBottom: "1rem",
        borderColor: "rgba(230, 57, 70, 0.45)",
        background: "rgba(230, 57, 70, 0.08)",
      }}
    >
      <strong>Dados demonstração — não é feed ao vivo.</strong>{" "}
      {data.source === "demo"
        ? "Sem fixtures SportMonks da Copa ou token ausente. Conecte SPORTMONKS_API_TOKEN e o pacote World Cup."
        : "Fonte mista/demo. Valide em /admin/validacao antes de usar comercialmente."}
    </div>
  );
}
