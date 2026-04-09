import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { question, rewardType, rewardAmount, options } = await req.json();

    if (!question || !options || options.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
    
    if (authError || !authUser) return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No User'}` }, { status: 401 });

    const { data: profile } = await supabaseServer.from('users').select('username, is_admin').eq('id', authUser.id).single();
    if (!profile?.is_admin && profile?.username !== 'admin') return NextResponse.json({ error: "Forbidden: Not Admin" }, { status: 403 });

    // 2. Insert event
    const { data: event, error: eventError } = await supabaseAdmin
      .from("custom_events")
      .insert({
        question,
        reward_type: rewardType || "participation",
        reward_amount: parseInt(rewardAmount) || 0,
        status: "active"
      })
      .select()
      .single();

    if (eventError || !event) throw eventError;

    // 3. Insert options
    const optionInserts = options.map((opt: string) => ({
      event_id: event.id,
      option_text: opt
    }));

    const { error: optionsError } = await supabaseAdmin
      .from("custom_event_options")
      .insert(optionInserts);

    if (optionsError) throw optionsError;

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    console.error("Event creation error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
