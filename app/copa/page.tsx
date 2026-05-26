import CopaPageClient from "@/components/copa/CopaPageClient";
import { COPA_BRAND } from "@/lib/copa/config";

export const metadata = {
  title: `${COPA_BRAND.title} — GoalPressure AI`,
  description:
    "Centro especial da Copa do Mundo 2026: calendário, grupos, classificação, GPI, replay e integrações institucionais.",
};

export default function CopaPage() {
  return <CopaPageClient />;
}
