"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { analytics } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    analytics.login("email");
    router.push("/dashboard");
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    analytics.login("google");
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-2xl text-green-DEFAULT mb-3" style={{textShadow:"0 0 20px rgba(0,255,135,0.5)"}}>
            AURA
          </h1>
          <h1 className="text-2xl text-white mb-6">MARKET</h1>
          <p className="text-faint text-xs">2026 WORLD CUP PREDICTION MARKET</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-sm text-white mb-8 text-center">ENTER THE MARKET</h2>

          {error && (
            <div className="bg-pink-dim border-2 border-pink-DEFAULT p-3 mb-6">
              <p className="text-pink-DEFAULT text-xs">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-faint text-xs mb-2">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="pixel-input"
                required
              />
            </div>
            <div>
              <label className="block text-faint text-xs mb-2">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pixel-input"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-pixel btn-green w-full mt-2"
            >
              {loading ? "LOADING..." : "LOGIN →"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-faint text-xs">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="btn-pixel btn-ghost w-full"
          >
            CONTINUE WITH GOOGLE
          </button>

          <p className="text-center text-faint text-xs mt-8">
            NO ACCOUNT?{" "}
            <Link href="/auth/signup" className="text-green-DEFAULT hover:underline">
              SIGN UP
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}