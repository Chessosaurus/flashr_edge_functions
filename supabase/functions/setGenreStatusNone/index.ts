import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0"


const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_KEY") as string;
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

Deno.serve(async (req) => {

  const body = await req.json();

  const {user_id, genre_id} = body;

  const { error } = await supabase
  .from('GenreStatus')
  .delete()
  .eq('user_id', user_id)
  .eq('genre_id', genre_id)
        
  const resp = {error}
  
  return new Response(
    JSON.stringify( resp ),
    { headers: { "Content-Type": "application/json" } },
  )
})


