import GoalPressureSportsTerminal from "@/components/terminal/sports/GoalPressureSportsTerminal";

export const metadata = {
  title: "Terminal — GoalPressure AI",
  description:
    "Painel esportivo ao vivo — pressão ofensiva, valor esperado e leitura tática em tempo real.",
};

export default function TerminalPage() {
  return <GoalPressureSportsTerminal />;
}
