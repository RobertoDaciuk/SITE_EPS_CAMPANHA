import React from "react";

/**
 * Layout ADMIN sob o grupo (dashboard)
 *
 * IMPORTANTE: O grupo (dashboard) já aplica o `DashboardLayout` em
 * `app/(dashboard)/layout.tsx`. Para evitar layout duplicado (página dentro de outra),
 * este layout de admin NÃO deve embrulhar novamente com `DashboardLayout`.
 * Apenas repassa os children.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}