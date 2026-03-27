"use client";

import dynamic from "next/dynamic";

const ClientShell = dynamic(
  () => import("./ClientShell").then((mod) => mod.ClientShell),
  { ssr: false }
);

export function ClientShellLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientShell>{children}</ClientShell>;
}
