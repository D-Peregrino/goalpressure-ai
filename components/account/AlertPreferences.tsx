"use client";

export default function AlertPreferences() {
  return (
    <section className="gp-alert-prefs">
      <h2 className="gp-alert-prefs__title">Preferências de alerta</h2>
      <p className="gp-alert-prefs__sub">
        Em breve: escolha quais movimentos deseja receber por e-mail ou push.
      </p>
      <label className="gp-alert-prefs__item">
        <input type="checkbox" defaultChecked disabled />
        Oportunidades na central
      </label>
      <label className="gp-alert-prefs__item">
        <input type="checkbox" disabled />
        Resumo diário (em breve)
      </label>
    </section>
  );
}
