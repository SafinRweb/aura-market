"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { analytics } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AuraPoints from "@/components/ui/AuraPoints";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    analytics.signUp("email");
    router.push("/auth/setup");
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    analytics.signUp("google");
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-12">
          <h1 className="text-2xl text-green-DEFAULT mb-3" style={{ textShadow: "0 0 20px rgba(0,255,135,0.5)" }}>
            AURA
          </h1>
          <h1 className="text-2xl text-white mb-6">MARKET</h1>
          <p className="text-faint text-xs">JOIN THE MARKET. PROVE YOUR KNOWLEDGE.</p>
        </div>

        <div className="card p-8">
          <h2 className="text-sm text-white mb-8 text-center">CREATE ACCOUNT</h2>

          {error && (
            <div className="bg-pink-dim border-2 border-pink-DEFAULT p-3 mb-6">
              <p className="text-pink-DEFAULT text-xs">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
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
                placeholder="min. 8 characters"
                className="pixel-input"
                required
              />
            </div>
            <div>
              <label className="block text-faint text-xs mb-2">CONFIRM PASSWORD</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="repeat password"
                className="pixel-input"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-pixel btn-green w-full mt-2"
            >
              {loading ? "CREATING..." : <span className="flex items-center justify-center gap-2">CREATE ACCOUNT <ArrowRight size={14} className="-mt-[2px]" /></span>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-faint text-xs">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button onClick={handleGoogle} className="btn-pixel btn-ghost w-full">
            CONTINUE WITH GOOGLE
          </button>

          <p className="text-center text-faint text-xs mt-8">
            HAVE AN ACCOUNT?{" "}
            <Link href="/auth/login" className="text-green-DEFAULT hover:underline">
              LOGIN
            </Link>
          </p>
        </div>

        {/* Starting bonus */}
        <div className="mt-6 border-2 border-green-dim bg-green-dim p-4 text-center">
          <p className="text-green-DEFAULT text-xs flex items-center justify-center gap-1"><AuraPoints size={20} /> NEW PLAYERS GET 100 AURA FREE</p>
        </div>
      </div>
    </div>
  );
}