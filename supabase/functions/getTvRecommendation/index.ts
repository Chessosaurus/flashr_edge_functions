import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";

const env = await load();
const supUrl = env["_SUPABASE_URL"];
const supKey = env["_SUPABASE_KEY"];
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

async function getTvRecommendation(req: Request): Promise<Response> {

  const { user_ids, index }: { user_ids: number[], index: number } = await req.json();
  
  let resp = null;

  const responeBody = {
    message: 'Request has failed!',
    resp
  }
  if (!user_ids) {
    return new Response(
      JSON.stringify( responeBody ),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  let tvRecommendations:number[] = [];

  user_ids.forEach(user_id => {
    (async () => {
      const { data: likedTvs, error: _errorLikedTvs } = await supabase
      .from("TVStatus")
      .select("tv_id")
      .eq("user_id", user_id)
      .eq("status", 1);

      if (likedTvs && likedTvs.length > 0) {
        likedTvs.forEach(tv => {
          tvRecommendations.push(tv.tv_id);
        });
      }
    })();
  });

  const frequency = tvRecommendations.reduce((acc, tv) => {
    acc[tv] = (acc[tv] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const sortedArray = Object.entries(frequency);
  sortedArray.sort((a, b) => b[1] - a[1]);

  let result = null;
  const resultList = sortedArray.map(entry => entry[0]);

  if (index < resultList.length) {
    result = resultList[index];
  }
  
  // result zurückgeben

  return new Response(result, {
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(getTvRecommendation)