"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileForm() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={save} className="gp-profile-form">
      <h2 className="gp-profile-form__title">Seus dados</h2>
      <label className="gp-auth-form__label">
        Nome
        <input
          className="gp-auth-form__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="gp-auth-form__label">
        E-mail
        <input className="gp-auth-form__input" value={user.email} disabled />
      </label>
      <label className="gp-auth-form__label">
        Telefone (opcional)
        <input
          className="gp-auth-form__input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <button type="submit" className="gp-btn gp-btn--primary">
        Salvar
      </button>
      {saved && <p className="gp-profile-form__ok">Dados salvos localmente (perfil Supabase em breve).</p>}
    </form>
  );
}
