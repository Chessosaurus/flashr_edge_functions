import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";

const env = await load();
const supUrl = env["_SUPABASE_URL"];
const supKey = env["_SUPABASE_KEY"];
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

async function getMovieRecommendation(req: Request): Promise<Response>  {
  
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

  let movieRecommendations:number[] = [];

  user_ids.forEach(user_id => {
    (async () => {
      const { data: likedMovies, error: _errorLikedMovies } = await supabase
      .from("MovieStatus")
      .select("movie_id")
      .eq("user_id", user_id)
      .eq("status", 1);

      if (likedMovies && likedMovies.length > 0) {
        likedMovies.forEach(movie => {
          movieRecommendations.push(movie.movie_id);
        });
      }
    })();
  });

  // Liste durchgehen und Häufigkeit der einzelnen Filme zählen und Liste mit Filme nach Häufigkeit sortiert erstellen und daraus Film bei "index" zurückgeben
  const frequency = movieRecommendations.reduce((acc, mov) => {
    acc[mov] = (acc[mov] || 0) + 1;
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

Deno.serve(getMovieRecommendation)