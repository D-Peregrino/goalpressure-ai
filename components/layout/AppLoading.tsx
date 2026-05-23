export default function AppLoading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="gp-app-loading" role="status" aria-live="polite">
      <div className="gp-app-loading__spinner" aria-hidden />
      <p>{label}</p>
    </div>
  );
}
