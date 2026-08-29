"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, X } from "lucide-react";

export function RemoveFromListButton({ listId, leadId }: { listId: string; leadId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      className="btn-ghost !px-2 !py-1.5 text-xs text-ink-500 hover:!text-red-600"
      title="Tirar desta lista (o lead continua no CRM)"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/lists/${listId}?leadId=${leadId}`, { method: "DELETE" });
        router.refresh();
        setBusy(false);
      }}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
    </button>
  );
}
