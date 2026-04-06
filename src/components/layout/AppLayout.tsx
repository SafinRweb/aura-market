"use client";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-bg crt flex flex-col">
      <main key={pathname} className="pt-20 pb-24 md:pb-6 flex-1 relative animate-fade-in">
        {children}
      </main>
    </div>
  );
}