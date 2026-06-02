import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function HubLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
