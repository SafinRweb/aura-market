"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError("Invalid credentials");
            setLoading(false);
            return;
        }

        // Check admin flag
        const { data: profile } = await supabase
            .from("users")
            .select("is_admin")
            .eq("id", data.user.id)
            .single();

        if (!profile?.is_admin) {
            await supabase.auth.signOut();
            setError("You do not have admin access");
            setLoading(false);
            return;
        }

        router.push("/admin");
    }

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="w-full max-w-sm">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Shield size={20} className="text-green-DEFAULT" />
                        <h1 className="neon-green text-xl">ADMIN</h1>
                    </div>
                    <p className="text-faint text-xs">AURA MARKET CONTROL PANEL</p>
                </div>

                <div className="card p-6">
                    {error && (
                        <div className="bg-pink-dim border-2 border-pink-DEFAULT p-3 mb-5">
                            <p className="text-pink-DEFAULT text-xs">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-faint text-xs mb-2">EMAIL</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="admin@email.com"
                                className="pixel-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-faint text-xs mb-2">PASSWORD</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="pixel-input pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-white"
                                >
                                    {showPassword
                                        ? <EyeOff size={14} />
                                        : <Eye size={14} />
                                    }
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-pixel btn-green w-full mt-2"
                        >
                            {loading ? "VERIFYING..." : "ACCESS PANEL →"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-faint text-xs mt-4">
                    RESTRICTED ACCESS · ADMINS ONLY
                </p>
            </div>
        </div>
    );
}