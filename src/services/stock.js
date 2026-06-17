import { supabase } from "../lib/supabase.js";

export async function fetchStock() {
  const { data, error } = await supabase.from("product_stock").select("*");
  if (error) throw error;
  return Object.fromEntries(data.map((s) => [s.product_id, s.available]));
}

export async function toggleStock(productId, available) {
  const { error } = await supabase
    .from("product_stock")
    .upsert({ product_id: productId, available });
  if (error) throw error;
}
