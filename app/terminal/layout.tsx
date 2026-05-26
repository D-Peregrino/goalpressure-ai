import { Orbitron } from "next/font/google";
import "../styles/terminal-bloomberg.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return <div className={orbitron.variable}>{children}</div>;
}
