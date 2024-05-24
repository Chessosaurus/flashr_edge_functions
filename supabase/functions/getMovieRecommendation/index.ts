import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
//import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";

//const env = await load();
//const supUrl = env["_SUPABASE_URL"];
//const supKey = env["_SUPABASE_KEY"];


const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_API_KEY") as string;
const tmdbKey = Deno.env.get("_TMDB_API_KEY") as string;

const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

async function getMovieRecommendation(req: Request): Promise<Response>  {
  
  const { user_ids }: { user_ids: number[] } = await req.json();
  
  const responeBody = {
    message: 'Request has failed!',
  }
  if (!user_ids) {
    return new Response(
      JSON.stringify( responeBody ),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  let movieRecommendations:number[] = [];

  const promises = user_ids.map(async(user_id) => {
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
  });

  await Promise.all(promises)

  // Liste durchgehen und Häufigkeit der einzelnen Filme zählen und Liste mit Filme nach Häufigkeit sortiert erstellen und daraus Film bei "index" zurückgeben
  const frequency = movieRecommendations.reduce((acc, mov) => {
    acc[mov] = (acc[mov] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const sortedArray = Object.entries(frequency);
  sortedArray.sort((a, b) => b[1] - a[1]);

  const result:any[]=[];
  const resultList = sortedArray.map(entry => entry[0]);

  const promisesDB = resultList.map(async (item) => {
    const { data: likedMovies, error: _errorLikedMovies } = await supabase
    .from("Movie")
    .select("*")
    .eq("id", item);
    result.push(likedMovies![0]);

  });

  await Promise.all(promisesDB);

  const promisesProvider = result.map(async (item:any) => {
    const watchProviderInfo = await fetch(`https://api.themoviedb.org/3/movie/${item.id}/watch/providers`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${tmdbKey}`,
        Host: 'api.themoviedb.org'
      },
    })

    const watchProviderData = await watchProviderInfo.json();
    item.watch_providers = watchProviderData.results.DE;
    
  });
  await Promise.all(promisesProvider);
  
  // result zurückgeben
  return new Response(JSON.stringify(result), {
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(getMovieRecommendation)