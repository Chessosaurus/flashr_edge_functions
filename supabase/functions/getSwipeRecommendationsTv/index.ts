import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";

const env = await load();
const supUrl = env["_SUPABASE_URL"];
const supKey = env["_SUPABASE_KEY"];
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

async function getSwipeRecommendationsTv(req: Request): Promise<Response> {

  const {user_id, tv_count} = await req.json()

  let resp = null;

  const resultGenres:number[] = [];
  const resultActors:number[] = [];

  // Liked TVs

  const { data: likedTvs, error: _errorLikedTvs } = await supabase
  .from("TVStatus")
  .select("tv_id")
  .eq("user_id", user_id)
  .eq("status", 1);

  // Liked Genres

  const { data: likedGenres, error: _errorLikedGenres } = await supabase
  .from("GenreStatus")
  .select("genre_id")
  .eq("user_id", user_id)
  .eq("status", 1);

  if (likedGenres && likedGenres.length > 0) {
    const likedGenresAsNumberArray : number[] = likedGenres.map(item => item.genre_id);
    likedGenresAsNumberArray.forEach(item => {
      resultGenres.push(item);
    });
  }

  // Genres der Liked TVs

  if (likedTvs && likedTvs.length > 0) {
    likedTvs.forEach(tv_id => {
      (async () => {
        const { data: genresFromLikedTv, error: _errorGenresFromLikedTv } = await supabase
        .from("TVGenre")
        .select("genre_id")
        .eq("tv_id", tv_id);

        if (genresFromLikedTv && genresFromLikedTv.length > 0) {
          const tvGenresAsNumberArray : number[] = genresFromLikedTv.map(item => item.genre_id);
          tvGenresAsNumberArray.forEach(item => {
            resultGenres.push(item);
          });
        }
      })();
    });
  }

  let genresString = "";
  if (resultGenres.length > 0) {
    genresString = "&with_genres=";
    resultGenres.forEach(genre_id => {
      genresString += genre_id + "%7C";
    });
  }

  // Liked Actors

  const { data: likedActors, error: _errorLikedActors } = await supabase
  .from("ActorStatus")
  .select("actor_id")
  .eq("user_id", user_id)
  .eq("status", 1);

  if (likedActors && likedActors.length > 0) {
    const likedActorsAsNumberArray : number[] = likedActors.map(item => item.actor_id);
    
    likedActorsAsNumberArray.forEach(item => {
      resultActors.push(item);
    });
  }

  // Actors der Liked TVs

  if (likedTvs && likedTvs.length > 0) {
    likedTvs.forEach(tv_id => {
      (async () => {
        const { data: actorsFromLikedTv, error: _errorActorsFromLikedTv } = await supabase
        .from("TVActor")
        .select("actor_id")
        .eq("tv_id", tv_id);

        if (actorsFromLikedTv && actorsFromLikedTv.length > 0) {
          const tvActorsAsNumberArray : number[] = actorsFromLikedTv.map(item => item.actor_id);
          tvActorsAsNumberArray.forEach(item => {
            resultActors.push(item);
          });
        }
      })();
    });
  }

  let actorsString = "";
  if (resultActors.length > 0) {
    actorsString = "&with_cast=";
    resultActors.forEach(actor_id => {
      actorsString += actor_id + "%7C";
    });
  }

  const response = await fetch("https://api.themoviedb.org/3/discover/tv?include_adult=false&include_null_first_air_dates=false&language=de-DE&page=1&sort_by=popularity.desc" + actorsString + genresString, {
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3MzM2ZDExMGY1YjRlMDY5NTc1ZDFiNzdiMTMzMmM2YSIsInN1YiI6IjY1ZmQ1OWI2MjI2YzU2MDE2NDZlZGMwOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.81HUBUnUJvJD9qHxOxS7a0hkFumc3AqC6v52b8wWesM',
      Host: 'api.themoviedb.org'
    },
  });

  // Ueberpruefung, ob zu diesen TVs und User jeweils ein TVStatus existiert

  const tvs = await response.json();

  const resultTvs:any[] = [];

  const { data: ratedTvs, error: _errorRatedTvs } = await supabase
  .from("TVStatus")
  .select("tv_id")
  .eq("user_id", user_id);

  if (tvs && tvs.results && tvs.results.length > 0) {
    tvs.results.forEach((tv:any) => {
      if (ratedTvs && ratedTvs.length > 0) {
        if (!ratedTvs.includes(tv.id)) {
          resultTvs.push(tv);
        }
      } else {
        resultTvs.push(tv);
      }
    });
  }

  let result = [];

  // Anzahl zurueckgebender Filme beachten
  if (tv_count < resultTvs.length) {
    for (let i = 0; i < tv_count; i++) {
      let tv = resultTvs.pop();
      result.push(tv);
    }
  } else {
    resultTvs.forEach((tv:any) => {
      result.push(tv);
    });
  }


  return new Response(JSON.stringify(result), {
    headers: {
      "content-type": "application/json",
    },
  });
}