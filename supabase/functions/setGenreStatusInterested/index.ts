import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0"


const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_KEY") as string;
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

Deno.serve(async (req) => {

  const {user_id, genre_id} = await req.json()

  const { data, error } = await supabase
  .from("GenreStatus")
  .insert([
    { user_id: user_id, genre_id: genre_id, status: 1 },
  ])
  .select()

  const resp = {data: data,error}
  
  return new Response(
    JSON.stringify( resp ),
    { headers: { "Content-Type": "application/json" } },
  )
})


