import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0"


const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_KEY") as string;
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

Deno.serve(async (req) => {

  const {user_id, group_name, icon} = await req.json()
  let resp

  const { data: existingData, error: _existingError } = await supabase
  .from("Group")
  .select("id")
  .eq("creator_Id", user_id)
  .eq("name", group_name);

  if (existingData?.length === 0){

    const { data, error } = await supabase
    .from("Group")
    .insert([{ creator_Id: user_id, name: group_name}])
    .select()
    resp = {data: data,error}

  }
  else{
    resp = {data: "Group already exists!"}
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


