import { supabase } from "../lib/supabase.js";

export async function fetchUnlockedDates() {
  const { data, error } = await supabase.from("unlocked_dates").select("date");
  if (error) throw error;
  return data.map((d) => d.date);
}

export async function toggleUnlockedDate(iso, add) {
  if (add) {
    const { error } = await supabase
      .from("unlocked_dates")
      .insert({ date: iso });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("unlocked_dates")
      .delete()
      .eq("date", iso);
    if (error) throw error;
  }
}
