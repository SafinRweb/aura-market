"use client";
import Navbar from "./Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg crt flex flex-col">
      <Navbar />
      <main className="pt-20 pb-20 md:pb-6 flex-1 relative">
        {children}
      </main>
    </div>
  );
}