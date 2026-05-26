"use client";

export default function CommandShortcuts() {
  return (
    <footer className="gp-cmd-shortcuts">
      <span>
        <kbd>↑</kbd>
        <kbd>↓</kbd> navegar
      </span>
      <span>
        <kbd>↵</kbd> executar
      </span>
      <span>
        <kbd>esc</kbd> fechar
      </span>
      <span className="gp-cmd-shortcuts__hint">
        <kbd>⌘</kbd>
        <kbd>K</kbd>
      </span>
    </footer>
  );
}
