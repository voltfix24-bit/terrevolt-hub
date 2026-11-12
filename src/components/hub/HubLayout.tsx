import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function HubLayout({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Close the mobile menu whenever the route changes.
  useEffect(() => setMobileNavOpen(false), [pathname]);
  return (
    <div className="flex min-h-dvh w-full bg-background text-foreground">
      <Sidebar />
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="min-w-0 flex-1 px-4 pb-safe pt-5 sm:px-6 sm:pt-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
