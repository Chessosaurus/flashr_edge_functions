import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
//import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";

//const env = await load();
//const supUrl = env["_SUPABASE_URL"];
//const supKey = env["_SUPABASE_KEY"];
//const tmdbKey = env["_TMDB_KEY"];

const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_API_KEY") as string;
const tmdbKey = Deno.env.get("_TMDB_API_KEY") as string;
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

async function getSwipeRecommendationsMovie(req: Request): Promise<Response>  {
  

  const {movie_id} = await req.json()

  let result;

  const watchProviderInfo = await fetch(`https://api.themoviedb.org/3/movie/${movie_id}/watch/providers`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${tmdbKey}`,
        Host: 'api.themoviedb.org'
      },
    })
  
  const watchProviderData = await watchProviderInfo.json();
  result = watchProviderData.results.DE;

  return new Response(JSON.stringify(result), {
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(getSwipeRecommendationsMovie)