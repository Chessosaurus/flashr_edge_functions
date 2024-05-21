import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
//import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";

//const env = await load();
//const supUrl = env["_SUPABASE_URL"];
//const supKey = env["_SUPABASE_KEY"];
//const tmdbKey = env["_TMDB_KEY"];

const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_API_KEY") as string;
const supabase = createClient(supUrl, supKey);

async function getTrailerForMovie(req: Request): Promise<Response>  {
  
  const {movie_id} = await req.json()

  let trailer = await getTrailer(movie_id, "de")

  if(trailer === null) {
    trailer = await getTrailer(movie_id, "en")
  }

  if(trailer === null) {
    trailer = "Für diesen Film ist leider kein Trailer vorhanden."
  }



  return new Response(JSON.stringify(trailer), {
    headers: {
      "content-type": "application/json",
    },
  });
}

async function getTrailer(movie_id:number, language:string) {

  const response = await fetch(`https://api.kinocheck.de/movies?tmdb_id=${movie_id}&language=${language}&categories=Trailer`);

  const trailerObject = await response.json();

  if('status' in trailerObject) {
    return null;
  } else {
    return `https://www.youtube.com/watch?v=${trailerObject.trailer.youtube_video_id}`
  }

}

Deno.serve(getTrailerForMovie)