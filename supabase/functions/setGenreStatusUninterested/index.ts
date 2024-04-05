import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0"


const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_KEY") as string;
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

Deno.serve(async (req) => {

  const {user_id, genre_id} = await req.json()
  let resp

  const { data: existingData, error: existingError } = await supabase
  .from("GenreStatus")
  .select("status")
  .eq("user_id", user_id)
  .eq("genre_id", genre_id);

  if (existingData === undefined){
    const { data, error } = await supabase
    .from("GenreStatus")
    .insert([{ user_id: user_id, genre_id: genre_id, status: 0 }])
    .select()
    resp = {data: data,error}
  }
  else{
    const { data, error } = await supabase
      .from("GenreStatus")
      .update([{ status: 0 }])
      .eq("user_id", user_id)
      .eq("genre_id", genre_id);
      resp = {data: data,error}
  }
  
  if(resp.error === null)
  {
    const responeBody = {
      message: 'Request has been successful!',
      resp
    }
    return new Response(
      
      JSON.stringify(responeBody),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  }

  const responeBody = {
    message: 'Request has failed!',
    resp
  }
  return new Response(
    JSON.stringify( responeBody ),
    { status: 400, headers: { "Content-Type": "application/json" } },
  )
})


