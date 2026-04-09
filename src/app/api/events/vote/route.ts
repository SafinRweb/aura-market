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

    if (!eventId || !optionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Check Auth
    const supabaseServer = createSupabaseServerClient();
    const { data: { user: authUser }, error: authError } = await supabaseServer.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch the Event to check rules
    const { data: event, error: eventError } = await supabaseAdmin
      .from("custom_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.status !== "active") {
      return NextResponse.json({ error: "Event is no longer active" }, { status: 400 });
    }

    // 3. Prevent duplicate votes implicitly via DB Unique Constraint, but let's try to insert
    const { error: insertError } = await supabaseAdmin
      .from("custom_event_votes")
      .insert({
        event_id: eventId,
        user_id: authUser.id,
        option_id: optionId
      });

    if (insertError) {
      if (insertError.code === "23505") { // unique violation
        return NextResponse.json({ error: "You have already voted on this event" }, { status: 400 });
      }
      throw insertError;
    }

    // 4. If reward_type is participation, reward immediately
    let rewarded = 0;
    if (event.reward_type === "participation" && event.reward_amount > 0) {
      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("aura_balance, id")
        .eq("id", authUser.id)
        .single();
        
      if (profile) {
        const newBalance = profile.aura_balance + event.reward_amount;
        await supabaseAdmin
          .from("users")
          .update({ aura_balance: newBalance })
          .eq("id", authUser.id);
          
        rewarded = event.reward_amount;
        
        // Notification
        await supabaseAdmin.from("notifications").insert({
          user_id: authUser.id,
          type: "daily_reward",
          message: `You earned ${event.reward_amount} Aura by voting on: ${event.question}`,
          aura_change: event.reward_amount,
          is_read: false
        });
      }
    }

    return NextResponse.json({ success: true, rewarded });
  } catch (err: any) {
    console.error("Event vote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
