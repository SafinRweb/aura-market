import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { eventId, optionId } = await req.json();

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    // 1. Check Admin Auth
    const supabaseServer = createSupabaseServerClient();
    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    
    let authUser = null;
    let authError = null;
    if (token) {
        const { data, error } = await supabaseServer.auth.getUser(token);
        authUser = data?.user;
        authError = error;
    } else {
        const { data, error } = await supabaseServer.auth.getUser();
        authUser = data?.user;
        authError = error;
    }

    if (authError || !authUser) {
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No User'}` }, { status: 401 });
    }

    const { data: profile } = await supabaseServer.from('users').select('username').eq('id', authUser.id).single();
    if (profile?.username !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Fetch the Event
    const { data: event, error: eventError } = await supabaseAdmin
      .from("custom_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    
    if (event.status === "closed") {
      return NextResponse.json({ error: "Event is already closed" }, { status: 400 });
    }

    // 3. Close the event & set resolved option
    await supabaseAdmin.from("custom_events").update({
      status: "closed",
      resolved_option_id: optionId || null
    }).eq("id", eventId);

    // 4. Distribute "win" rewards if applicable
    let totalRewarded = 0;
    if (event.reward_type === "win" && event.reward_amount > 0 && optionId) {
      // Find winners
      const { data: winners } = await supabaseAdmin
        .from("custom_event_votes")
        .select("user_id")
        .eq("event_id", eventId)
        .eq("option_id", optionId);
        
      if (winners && winners.length > 0) {
        // Need to update balances securely.
        for (const w of winners) {
          const { data: userProfile } = await supabaseAdmin.from("users").select("aura_balance").eq("id", w.user_id).single();
          if (userProfile) {
            await supabaseAdmin.from("users").update({ aura_balance: userProfile.aura_balance + event.reward_amount }).eq("id", w.user_id);
            await supabaseAdmin.from("notifications").insert({
              user_id: w.user_id,
              type: "bet_won",
              message: `You WON ${event.reward_amount} Aura by correctly predicting: ${event.question}`,
              aura_change: event.reward_amount,
              is_read: false
            });
            totalRewarded += event.reward_amount;
          }
        }
      }
    }

    return NextResponse.json({ success: true, totalRewarded, winners: totalRewarded / (event.reward_amount || 1) });
  } catch (err) {
    console.error("Event resolve error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
