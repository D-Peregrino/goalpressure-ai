import {
  templateBoasVindas,
  templateLeadRecebido,
  templatePagamentoConfirmado,
  templateTrialIniciado,
} from "@/lib/email/templates";

export async function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  const provider = process.env.EMAIL_PROVIDER?.trim();
  if (!provider || provider === "log") {
    console.info("[email:dev]", input.to, input.subject, input.body.slice(0, 120));
    return true;
  }
  // Resend/SendGrid: integrar quando EMAIL_API_KEY estiver definida
  return true;
}

export async function emailBoasVindas(to: string, nome: string) {
  const t = templateBoasVindas(nome);
  return sendEmail({ to, ...t });
}

export async function emailFundadorAtivo(to: string, nome: string) {
  const t = templateTrialIniciado(nome);
  return sendEmail({ to, ...t });
}

export async function emailPagamento(to: string, nome: string, valor: string) {
  const t = templatePagamentoConfirmado(nome, valor);
  return sendEmail({ to, ...t });
}

export async function emailLead(to: string) {
  const t = templateLeadRecebido(to);
  return sendEmail({ to, ...t });
}
