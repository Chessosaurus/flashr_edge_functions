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
  

  const {actor_id} = await req.json()

  const movies:number[] = []
  const resultList:any[] = []

  let check:any;

  const { data: likedMovies, error: _errorLikedMovies } = await supabase
  .from("MovieActor")
  .select("movie_id")
  .eq("actor_id", actor_id)

  if (likedMovies && likedMovies.length > 0) {

    const promises = likedMovies.map(async(movie) => {
      const response = await fetch("https://api.themoviedb.org/3/movie/" + movie.movie_id + "?language=de-DE", {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${tmdbKey}`,
          Host: 'api.themoviedb.org'
        },
      });

      const movies = await response.json();


      if (response) {
        resultList.push(movies)
      }
    });
  
    await Promise.all(promises)
}
 

  return new Response(JSON.stringify(resultList), {
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(getSwipeRecommendationsMovie)
