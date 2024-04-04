import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0"


const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_KEY") as string;
const supabase = createClient(supUrl, supKey);

Deno.serve(async () => {


  
  const { data: test, error } = await supabase
  .from('test')
  .select('*')

  const resp = {data: test,error}
  
  return new Response(
    JSON.stringify( resp ),
    { headers: { "Content-Type": "application/json" } },
  )
})


