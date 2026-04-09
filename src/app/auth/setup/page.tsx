"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowRight } from "lucide-react";
import { analytics } from "@/lib/analytics";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const checkTimeout = useRef<NodeJS.Timeout>();

  // Check username availability with debounce
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    clearTimeout(checkTimeout.current);
    checkTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from("users")
        .select("username")
        .eq("username", username.toLowerCase())
        .single();
      setUsernameStatus(data ? "taken" : "available");
    }, 500);
  }, [username]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (usernameStatus !== "available") return;
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    let avatar_url = null;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (uploadError) {
        setError("Avatar upload failed: " + uploadError.message);
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      avatar_url = urlData.publicUrl;
    }

    // Check for referral code
    const refCode = localStorage.getItem("pending_ref_code");
    let referrerId = null;
    let startingBalance = 100;

    if (refCode) {
      const { data: referrer } = await supabase
        .from("users")
        .select("id, username, aura_balance, total_referrals")
        .eq("referral_code", refCode)
        .single();

      if (referrer && referrer.id !== user.id) {
        referrerId = referrer.id;
        startingBalance = 150; // 100 base + 50 referral bonus

        // Create referral record
        await supabase.from("referrals").insert({
          referrer_id: referrer.id,
          referred_id: user.id,
        });

        // Update referrer's total referrals count
        await supabase.from("users").update({
          total_referrals: (referrer.total_referrals || 0) + 1,
        }).eq("id", referrer.id);

        // Notify referrer
        await supabase.from("notifications").insert({
          user_id: referrer.id,
          type: "daily_reward",
          message: `🎉 ${username.toLowerCase()} joined using your referral link!`,
          aura_change: 0,
        });

        // Clear stored ref code
        localStorage.removeItem("ref_code");
        localStorage.removeItem("pending_ref_code");
      }
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        username: username.toLowerCase(),
        avatar_url,
        aura_balance: startingBalance,
        referred_by: referrerId,
      });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    analytics.profileSetup();
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <h1 className="text-xl text-green-DEFAULT mb-3" style={{ textShadow: "0 0 20px rgba(0,255,135,0.5)" }}>
            SETUP YOUR PROFILE
          </h1>
          <p className="text-faint text-xs">ONE TIME ONLY. CHOOSE WISELY.</p>
        </div>


        <div className="card p-8">
          {error && (
            <div className="bg-pink-dim border-2 border-pink-DEFAULT p-3 mb-6">
              <p className="text-pink-DEFAULT text-xs">{error}</p>
            </div>
          )}

          <form onSubmit={handleSetup} className="space-y-6">

            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed border-border2 flex items-center justify-center cursor-pointer hover:border-green-DEFAULT transition-colors overflow-hidden"
                style={{ borderStyle: "dashed" }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <p className="text-faint text-xs">CLICK</p>
                    <p className="text-faint text-xs">UPLOAD</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-faint text-xs">AVATAR (OPTIONAL · MAX 2MB)</p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-faint text-xs mb-2">USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                placeholder="letters, numbers, _"
                className="pixel-input"
                maxLength={20}
                minLength={3}
                required
              />
              {/* Status indicator */}
              <div className="mt-2 h-4">
                {usernameStatus === "checking" && (
                  <p className="text-faint text-xs">CHECKING...</p>
                )}
                {usernameStatus === "available" && (
                  <p className="text-green-DEFAULT text-xs">✓ AVAILABLE</p>
                )}
                {usernameStatus === "taken" && (
                  <p className="text-pink-DEFAULT text-xs">✗ ALREADY TAKEN</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || usernameStatus !== "available"}
              className="btn-pixel btn-green w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "SETTING UP..." : <span className="flex items-center justify-center gap-2">ENTER THE MARKET <ArrowRight size={14} className="-mt-[2px]" /></span>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}