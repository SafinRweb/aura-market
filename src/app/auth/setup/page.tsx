"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { analytics } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import AuraCoin from "@/components/ui/AuraCoin";

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

    // Upload avatar if provided
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

    // Update user profile
    const { error: updateError } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        username: username.toLowerCase(),
        avatar_url,
        aura_balance: 100,
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

        {/* Starting balance banner */}
        <div className="bg-green-dim border-2 border-green-DEFAULT p-4 mb-6 text-center"
          style={{ boxShadow: "0 0 20px rgba(0,255,135,0.2)" }}>
          <p className="text-green-DEFAULT text-xs flex items-center justify-center gap-1"><AuraCoin size={20} /> 100 AURA LOADED INTO YOUR ACCOUNT</p>
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
              {loading ? "SETTING UP..." : "ENTER THE MARKET →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}