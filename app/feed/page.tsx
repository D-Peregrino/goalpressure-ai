import AppShell from "@/components/layout/AppShell";
import LiveDashboard from "@/components/LiveDashboard";
import { PAGE_COPY } from "@/lib/ux/productCopy";

export default function FeedPage() {
  const copy = PAGE_COPY.feed;
  return (
    <AppShell title={copy.title} subtitle={copy.subtitle}>
      <LiveDashboard />
    </AppShell>
  );
}
