/* eslint-disable @typescript-eslint/no-explicit-any */
export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Log pageview
export function pageview(url: string) {
  if (typeof window === "undefined" || !GA_ID) return;
  (window as any).gtag("config", GA_ID, { page_path: url });
}

// Log custom event
export function event(action: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined" || !GA_ID) return;
  (window as any).gtag("event", action, params);
}

// Pre-built events for key actions
export const analytics = {
  betPlaced: (marketType: string, stake: number) =>
    event("bet_placed", { market_type: marketType, stake }),

  signUp: (method: "email" | "google") =>
    event("sign_up", { method }),

  login: (method: "email" | "google") =>
    event("login", { method }),

  dailyClaimed: (streak: number, amount: number) =>
    event("daily_claimed", { streak, amount }),

  profileSetup: () =>
    event("profile_setup_completed"),
};