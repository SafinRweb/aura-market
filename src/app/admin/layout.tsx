"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    Shield, LayoutDashboard, Trophy,
    Users, Bell, LogOut, Zap, Calendar
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [adminEmail, setAdminEmail] = useState("");

    useEffect(() => {
        async function check() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/admin/login"); return; }
            setAdminEmail(user.email || "");
        }
        check();
    }, [router]);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/admin/login");
    }

    if (pathname === "/admin/login") return <>{children}</>;

    const links = [
        { href: "/admin", label: "DASHBOARD", icon: <LayoutDashboard size={13} /> },
        { href: "/admin/matches", label: "MATCHES", icon: <Calendar size={13} /> },
        { href: "/admin/bets", label: "BETS", icon: <Zap size={13} /> },
        { href: "/admin/users", label: "USERS", icon: <Users size={13} /> },
        { href: "/admin/notifications", label: "NOTIFY", icon: <Bell size={13} /> },
    ];

    return (
        <div className="min-h-screen bg-bg flex">

            {/* Sidebar */}
            <aside className="w-52 bg-bg2 border-r-2 border-border flex flex-col fixed top-0 left-0 bottom-0">
                {/* Logo */}
                <div className="p-4 border-b-2 border-border">
                    <div className="flex items-center gap-2 mb-1">
                        <Shield size={14} className="text-green-DEFAULT" />
                        <span className="neon-green text-sm">ADMIN</span>
                    </div>
                    <p className="text-faint text-xs truncate">{adminEmail}</p>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1">
                    {links.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2 text-xs border-2 transition-all
                ${pathname === link.href
                                    ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                                    : "border-transparent text-faint hover:text-white hover:border-border"
                                }`}
                        >
                            {link.icon}
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Back to site + logout */}
                <div className="p-3 border-t-2 border-border space-y-2">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-faint hover:text-white border-2 border-transparent hover:border-border transition-all"
                    >
                        <Trophy size={13} />
                        VIEW SITE
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-faint hover:text-pink-DEFAULT border-2 border-transparent hover:border-pink-DEFAULT transition-all w-full"
                    >
                        <LogOut size={13} />
                        LOGOUT
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="ml-52 flex-1 p-6">
                {children}
            </main>
        </div>
    );
}