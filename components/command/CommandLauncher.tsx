"use client";

import { Command } from "lucide-react";
import { useCommandPalette } from "@/contexts/CommandContext";

/** Botão global para abrir a paleta — estilo Raycast. */
export default function CommandLauncher() {
  const { setOpen } = useCommandPalette();

  return (
    <button
      type="button"
      className="gp-cmd-launcher"
      onClick={() => setOpen(true)}
      aria-label="Abrir comandos (⌘K)"
      title="Comandos · ⌘K"
    >
      <Command className="h-4 w-4" />
      <span className="gp-cmd-launcher__label">Comandos</span>
      <kbd className="gp-cmd-launcher__kbd">⌘K</kbd>
    </button>
  );
}
