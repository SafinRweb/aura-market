"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatAura } from "@/lib/utils";
import { User } from "@/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Trophy, Globe, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import AuraCoin from "@/components/ui/AuraCoin";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setLoaded(true); return; }

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (data) setUser(data);

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", authUser.id)
        .eq("is_read", false);
      setUnread(count || 0);
      setLoaded(true);
    }
    loadUser();

    const channel = supabase
      .channel("navbar")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "users",
      }, (payload) => {
        setUser(prev => prev ? { ...prev, ...payload.new as User } : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const links = [
    { href: user ? "/dashboard" : "/", label: "FEED", icon: <LayoutDashboard size={13} /> },
    { href: "/hub", label: "HUB", icon: <Globe size={13} /> },
    { href: "/leaderboard", label: "RANKS", icon: <Trophy size={13} /> },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-bg2 border-b-2 border-border flex items-center px-5 gap-4">

        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 mr-3">
          <span className="neon-green text-lg">AURA</span>
          <span className="text-white text-lg hidden sm:block">MARKET</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-4 py-2 text-sm border-2 transition-all
              ${pathname === link.href
                  ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                  : "border-transparent text-faint hover:text-white hover:border-border"
                }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              {/* Balance */}
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-dim border-2 border-green-DEFAULT animate-glow-pulse">
                <span className="text-green-DEFAULT text-sm inline-flex items-center gap-1.5">
                  {formatAura(user.aura_balance)}
                  <AuraCoin size={24} />
                </span>
              </div>

              {/* Notifications */}
              <Link href="/notifications" className="relative p-2 border-2 border-border hover:border-border2 transition-colors">
                <Bell size={15} className="text-muted" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-DEFAULT text-white flex items-center justify-center" style={{ fontSize: "7px" }}>
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>

              {/* Avatar */}
              <Link href="/profile" className="flex items-center gap-2 p-1 border-2 border-border hover:border-green-DEFAULT transition-colors">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="w-8 h-8 object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-surface2 flex items-center justify-center">
                    <span className="text-green-DEFAULT text-sm">
                      {user.username?.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="hidden md:block text-white text-sm pr-1">
                  {user.username?.toUpperCase()}
                </span>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 border-2 border-border hover:border-pink-DEFAULT hover:text-pink-DEFAULT text-faint transition-colors"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            loaded && (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/auth/login" className="btn-pixel btn-ghost text-xs sm:text-sm px-2 sm:px-4 py-2">
                  LOGIN
                </Link>
                <Link href="/auth/signup" className="btn-pixel btn-green text-xs sm:text-sm px-2 sm:px-4 py-2">
                  <span className="hidden sm:inline">SIGN UP</span>
                  <span className="sm:hidden">JOIN</span>
                </Link>
              </div>
            )
          )}
          
          {/* Mobile menu toggle */}
          <button 
            className="md:hidden p-2 text-faint hover:text-white hover:text-green-DEFAULT transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative w-64 max-w-[80vw] bg-bg2 h-full border-r-2 border-border shadow-[0_0_40px_rgba(0,255,135,0.1)] flex flex-col pt-5 animate-slide-in">
            <div className="flex items-center justify-between px-5 mb-8">
              <span className="neon-green text-lg">MENU</span>
              <button 
                className="text-faint hover:text-white"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col gap-2 px-3">
              {links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-4 text-sm border-2 transition-all
                  ${pathname === link.href
                      ? "border-green-DEFAULT text-green-DEFAULT bg-green-dim"
                      : "border-transparent text-faint hover:text-white hover:border-border hover:bg-surface2"
                    }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
              
              {!user && loaded && (
                <div className="mt-8 flex flex-col gap-3 pt-6 border-t border-border">
                  <Link 
                    href="/auth/login" 
                    onClick={() => setIsSidebarOpen(false)}
                    className="btn-pixel btn-ghost text-sm py-4 text-center"
                  >
                    LOGIN
                  </Link>
                  <Link 
                    href="/auth/signup" 
                    onClick={() => setIsSidebarOpen(false)}
                    className="btn-pixel btn-green text-sm py-4 text-center"
                  >
                    SIGN UP
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation (Logged In) */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-bg2 border-t-2 border-border flex items-center justify-around px-2">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 p-2 ${pathname === link.href ? "text-green-DEFAULT" : "text-faint hover:text-white"
                }`}
            >
              {link.icon}
              <span className="text-[8px] tracking-widest">{link.label}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}