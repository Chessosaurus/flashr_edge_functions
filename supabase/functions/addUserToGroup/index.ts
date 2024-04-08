import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0"


const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_KEY") as string;
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

Deno.serve(async (req) => {

  const {user_id, group_id} = await req.json()


  let resp

  const { data: existingData, error: _existingError } = await supabase
  .from("UserInGroup")
  .select("user_Id")
  .eq("user_Id", user_id)
  .eq("group_Id", group_id);

  if (existingData?.length === 0){

    const { data, error } = await supabase
    .from("UserInGroup")
    .insert([{ user_Id: user_id, group_Id: group_id}])
    .select()
    resp = {data: data,error}

  }
  else{
    resp = {info: "User is already in the group!"}
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


