import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
//import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";

//const env = await load();
//const supUrl = env["_SUPABASE_URL"];
//const supKey = env["_SUPABASE_KEY"];
//const tmdbKey = env["_TMDB_KEY"];

const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_KEY") as string;
const tmdbKey = Deno.env.get("_TMDB_API_KEY") as string;
const supabase = createClient(supUrl, supKey);

async function getSwipeRecommendationsMovie(req: Request): Promise<Response>  {
  
  const timeWindow = 'week'

  const response = await fetch(`https://api.themoviedb.org/3/trending/tv/${timeWindow}?language=de-DE`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${tmdbKey}`,
      Host: 'api.themoviedb.org'
    },
  });

  const TVs = await response.json();

  const checkedTVs = TVs.results;

  checkedTVs.forEach((tv:any) => {
    if(tv.overview.length === 0){
      tv.overview = "Diese Serie enthält leider keine deutsche Beschreibung."
    }
  });

  return new Response(JSON.stringify(checkedTVs), {
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(getSwipeRecommendationsMovie)