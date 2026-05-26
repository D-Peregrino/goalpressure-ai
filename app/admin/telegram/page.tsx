"use client";

import AdminShell from "@/components/admin/AdminShell";
import TelegramDispatchAdmin from "@/components/admin/telegram/TelegramDispatchAdmin";

export default function AdminTelegramPage() {
  return (
    <AdminShell>
      <TelegramDispatchAdmin />
    </AdminShell>
  );
}
