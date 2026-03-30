import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const cookieStore = cookies();

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: import("@supabase/ssr").CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: import("@supabase/ssr").CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);

    // Get the user
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Check if they already have a username set
      const { data: profile } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();

      // If username starts with "user_" it means it was auto-generated
      // and they haven't done setup yet
      const needsSetup = !profile?.username || 
        profile.username.startsWith("user_");

      if (needsSetup) {
        return NextResponse.redirect(new URL("/auth/setup", requestUrl.origin));
      } else {
        return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
      }
    }
  }

  // Fallback
  return NextResponse.redirect(new URL("/auth/login", requestUrl.origin));
}