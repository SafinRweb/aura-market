import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { refCode, newUserId, username } = await req.json();

    if (!refCode || !newUserId || !username) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1. Look up referrer
    const { data: referrer } = await supabaseAdmin
      .from("users")
      .select("id, total_referrals, aura_balance, referral_earnings")
      .eq("referral_code", refCode)
      .single();

    if (!referrer || referrer.id === newUserId) {
      return NextResponse.json({ error: "Invalid referral" }, { status: 400 });
    }

    // 2. Check if referral already created
    const { data: checkRef } = await supabaseAdmin
      .from("referrals")
      .select("id")
      .eq("referred_id", newUserId)
      .single();

    if (checkRef) {
      return NextResponse.json({ error: "Already referred" }, { status: 400 });
    }

    // 3. Create referral record (mark bonus as already paid so background worker ignores it)
    const { error: refError } = await supabaseAdmin.from("referrals").insert({
      referrer_id: referrer.id,
      referred_id: newUserId,
      first_bet_bonus_paid: true
    });
    
    if (refError) throw refError;

    // 4. Update referrer's total referrals count and give 50 points
    await supabaseAdmin.from("users").update({
      total_referrals: (referrer.total_referrals || 0) + 1,
      aura_balance: (referrer.aura_balance || 0) + 50,
      referral_earnings: (referrer.referral_earnings || 0) + 50
    }).eq("id", referrer.id);

    // 5. Notify referrer
    await supabaseAdmin.from("notifications").insert({
      user_id: referrer.id,
      type: "daily_reward",
      message: `🎉 ${username.toLowerCase()} joined using your referral link! You earned 50 AURA bonus!`,
      aura_change: 50,
    });

    return NextResponse.json({
      success: true,
      referrerId: referrer.id,
      startingBalance: 150
    });
  } catch (err) {
    const e = err as Error;
    console.error("Referral process error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
