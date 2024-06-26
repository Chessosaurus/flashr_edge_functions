import {createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
//import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";

//const env = await load();
//const supUrl = env["_SUPABASE_URL"];
//const supKey = env["_SUPABASE_KEY"];
//const tmdbKey = env["TMDB_KEY"];

const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_API_KEY") as string;
const tmdbKey = Deno.env.get("_TMDB_API_KEY") as string;
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

async function getSwipeRecommendationsTv(req: Request): Promise<Response> {

  const {user_id, tv_count} = await req.json()

  let resp = null;

  const resultGenres:number[] = [];
  const resultActors:number[] = [];

  let test;

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
    const promises = likedTvs.map(async (item) => {
      const { data: genresFromLikedTv, error: _errorGenresFromLikedTv } = await supabase
        .from("TVGenre")
        .select("genre_id")
        .eq("tv_id", item.tv_id);
  
      if (genresFromLikedTv && genresFromLikedTv.length > 0) {
        const tvGenresAsNumberArray = genresFromLikedTv.map(item => item.genre_id);
        tvGenresAsNumberArray.forEach(item => {
          resultGenres.push(item);
        });
      }
    });
  
    await Promise.all(promises);
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
    const promises = likedTvs.map(async (item) => {
      const { data: actorsFromLikedTv, error: _errorActorsFromLikedTv } = await supabase
        .from("TVActor")
        .select("actor_id")
        .eq("tv_id", item.tv_id);
      
      test = actorsFromLikedTv;

      if (actorsFromLikedTv && actorsFromLikedTv.length > 0) {
        const tvActorsAsNumberArray = actorsFromLikedTv.map(item => item.actor_id);
        tvActorsAsNumberArray.forEach(item => {
          resultActors.push(item);
        });
      }
    });
  
    await Promise.all(promises);
  }

  let actorsString = "";
  if (resultActors.length > 0) {
    actorsString = "&with_cast=";
    resultActors.forEach(actor_id => {
      actorsString += actor_id + "%7C";
    });
  }


  const resultTvs = await fetchTVShows(user_id, tv_count, 1, actorsString, genresString);

  resultTvs.forEach((tv:any) =>{
    if(tv.overview.length === 0){
      //Hier wird eine Meldung gesetzt, falls der Overview leer ist.
      tv.overview = "Diese Serie enthält leider keine deutsche Beschreibung.";
    }
  });

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

  const promises = result.map(async (item) => {
    const watchProviderInfo = await fetch(`https://api.themoviedb.org/3/tv/${item.id}/watch/providers`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${tmdbKey}`,
        Host: 'api.themoviedb.org'
      },
    })

    const watchProviderData = await watchProviderInfo.json();
    item.watch_providers = watchProviderData.results.DE;
    
  });
  await Promise.all(promises);

  return new Response(JSON.stringify(result) , {
    headers: {
      "content-type": "application/json",
    },
  });
}


async function fetchTVShows(
  user_id: number,
  tv_count: number,
  page: number,
  actorsString: string,
  genresString: string,
): Promise<any[]> {
  const fetchTVShowsFromTMDB = async (page: number): Promise<any> => {
    const response = await fetch(
      `https://api.themoviedb.org/3/discover/tv?include_adult=false&include_null_first_air_dates=false&language=de-DE&page=${page}&sort_by=popularity.desc${actorsString}${genresString}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${tmdbKey}`,
          Host: 'api.themoviedb.org',
        },
      }
    );
    return await response.json();
  };

  const getRatedTVShows = async (user_id: number): Promise<number[]> => {
    const { data: ratedTvs, error: _errorRatedTvs } = await supabase
      .from("TVStatus")
      .select("tv_id")
      .eq("user_id", user_id);

    return ratedTvs ? ratedTvs.map((tv: any) => tv.tv_id) : [];
  };

  const filterTVShows = (tvs: any[], ratedTvId: number[]): any[] => {
    return tvs.filter((tv: any) => !ratedTvId.includes(tv.id));
  };

  const ratedTvId = await getRatedTVShows(user_id);
  let resultTvs: any[] = [];
  let currentPage = page;

  while (resultTvs.length < tv_count) {
    const tvs = await fetchTVShowsFromTMDB(currentPage);

    if (tvs && tvs.results && tvs.results.length > 0) {
      const filteredTvs = filterTVShows(tvs.results, ratedTvId);
      resultTvs = [...resultTvs, ...filteredTvs];
    } else {
      break; // Break the loop if no more TV shows are available
    }

    if (resultTvs.length >= tv_count) {
      resultTvs = resultTvs.slice(0, tv_count); // Ensure we return exactly tv_count TV shows
      break;
    }

    currentPage++;
  }

  return resultTvs;
}

Deno.serve(getSwipeRecommendationsTv);