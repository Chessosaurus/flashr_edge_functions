import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0"


const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_KEY") as string;
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

Deno.serve(async (req) => {

  const {user_id, genre_id} = await req.json()

  const { data: existingData, error: _existingError } = await supabase
  .from("GenreStatus")
  .select("status")
  .eq("user_id", user_id)
  .eq("genre_id", genre_id);

  return new Response(
    JSON.stringify( existingData ),
    { status: 400, headers: { "Content-Type": "application/json" } },
  )
})