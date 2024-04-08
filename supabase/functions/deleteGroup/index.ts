import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0"


const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_KEY") as string;
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

Deno.serve(async (req) => {

  const {user_id, group_id} = await req.json()
  let resp

  const { data: existingData, error: _existingError } = await supabase
  .from("Group")
  .select("creator_id")
  .eq("creator_Id", user_id)
  .eq("group_Id", group_id);

  if (existingData?.length === 0){

    resp = {message:"gruppe nicht gefunden"}

  }
  else{
    
    const UserInGroupDeleted = await deleteUserInGroupRecords(group_id)

    if(!UserInGroupDeleted) {

      const responeBody = {
        message: 'Something went wrong deleting the relation between group and user!',
      }

      return new Response(
        JSON.stringify( responeBody ),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }


    const groupDeleted = await deleteGroupRecords(group_id)

    if(!groupDeleted) {

      const responeBody = {
        message: 'Something went wrong deleting the group!',
      }

      return new Response(
        JSON.stringify( responeBody ),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

  }




 

  const responeBody = {
    message: 'Group deleted successfully!',
  }
  return new Response(
    JSON.stringify( responeBody ),
    { status: 400, headers: { "Content-Type": "application/json" } },
  )
  
})


const deleteUserInGroupRecords = async(group_id:number) =>{
  
  const { error } = await supabase
    .from('UserInGroup')
    .delete()
    .eq('group_Id', group_id);
  
  if(error) {
    return false;
  }
  return true;
}

const deleteGroupRecords = async(group_id:number) =>{
  
  const { error } = await supabase
    .from('Group')
    .delete()
    .eq('id', group_id);
  
  if(error) {
    return false;
  }
  return true;
}