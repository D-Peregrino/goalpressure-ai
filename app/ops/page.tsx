import { redirect } from "next/navigation";

/** Mantém /ops — redireciona para o terminal operacional principal */
export default function OpsPage() {
  redirect("/terminal");
}
