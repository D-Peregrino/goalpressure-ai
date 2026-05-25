"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { logAdminValidationError } from "@/lib/admin/adminValidationLog";

type Props = {
  children: ReactNode;
  title?: string;
  scope?: string;
};

type State = {
  hasError: boolean;
  message: string;
};

/**
 * Error boundary global do painel admin — evita tela branca em exceções de render/hydration.
 */
export default class AdminErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || "Erro desconhecido",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logAdminValidationError(error, {
      scope: this.props.scope ?? "admin_error_boundary",
      component: info.componentStack?.split("\n")[1]?.trim() ?? "unknown",
      route:
        typeof window !== "undefined" ? window.location.pathname : "/admin",
      extra: { componentStack: info.componentStack },
    });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, message: "" });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const title =
        this.props.title ?? "Erro ao carregar painel de validação";

      return (
        <div className="gp-admin-error-fallback" role="alert">
          <h2>{title}</h2>
          <p className="gp-admin-error-fallback__detail">{this.state.message}</p>
          <p className="gp-admin-error-fallback__hint">
            O painel permanece disponível. Tente recarregar ou voltar ao painel principal.
          </p>
          <div className="gp-admin-error-fallback__actions">
            <button
              type="button"
              className="gp-btn gp-btn--primary"
              onClick={this.handleRetry}
            >
              Tentar novamente
            </button>
            <a href="/admin" className="gp-btn gp-btn--ghost">
              Voltar ao painel
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
