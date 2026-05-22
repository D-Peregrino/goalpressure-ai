export function templateBoasVindas(nome: string): { subject: string; body: string } {
  return {
    subject: "Bem-vindo ao GoalPressure AI",
    body: `Olá ${nome},\n\nSua conta foi criada. Acesse a central ao vivo e explore a leitura esportiva em tempo real.\n\n— Equipe GoalPressure`,
  };
}

export function templateTrialIniciado(nome: string): { subject: string; body: string } {
  return {
    subject: "Seu acesso fundador está ativo",
    body: `Olá ${nome},\n\nSeu Plano Fundador foi ativado. Aproveite a central completa.\n\n— GoalPressure`,
  };
}

export function templatePagamentoConfirmado(
  nome: string,
  valor: string
): { subject: string; body: string } {
  return {
    subject: "Pagamento confirmado — GoalPressure",
    body: `Olá ${nome},\n\nRecebemos seu pagamento de ${valor}. Obrigado por apoiar o lançamento.\n\n— GoalPressure`,
  };
}

export function templateLeadRecebido(email: string): { subject: string; body: string } {
  return {
    subject: "Recebemos seu contato — GoalPressure",
    body: `Olá,\n\nObrigado pelo interesse (${email}). Entraremos em contato em breve.\n\n— GoalPressure`,
  };
}
