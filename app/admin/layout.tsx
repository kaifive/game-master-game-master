import type { ReactNode } from "react";
import { AdminRoot } from "@/components/theme";

/** Every admin page uses the standard admin look (ADR-021). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminRoot>
      <div className="min-h-dvh bg-gm-bg text-gm-text">{children}</div>
    </AdminRoot>
  );
}
