import TerminalDashboard from "@/components/terminal/dashboard/TerminalDashboard";

export const metadata = {
  title: "Terminal — GoalPressure AI",
  description: "Central operacional ao vivo — pressão, EV, dispatch e inteligência autônoma.",
};

export default function TerminalPage() {
  return <TerminalDashboard />;
}
