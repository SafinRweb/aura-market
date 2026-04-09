import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data: eventsData, error: eventsError } = await supabase.from('custom_events').select('*').limit(1);
  await supabase.rpc('get_table_names').select('*').limit(1); // Maybe doesn't exist
  
  // Try to just select from custom_polls, polls, events
  const { data: polls, error: pollsErr } = await supabase.from('polls').select('*').limit(1);
  const { data: preds, error: predsErr } = await supabase.from('predictions').select('*').limit(1);

  return NextResponse.json({
    custom_events: eventsError ? eventsError.message : eventsData,
    polls: pollsErr ? pollsErr.message : polls,
    predictions: predsErr ? predsErr.message : preds,
  });
}
