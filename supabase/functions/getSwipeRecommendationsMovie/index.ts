import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
//import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";

//const env = await load();
//const tmdbKey = env["_TMDB_API_KEY"];
//const supUrl = env["_SUPABASE_URL"];
//const supKey = env["_SUPABASE_API_KEY"];


const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_API_KEY") as string;
const tmdbKey = Deno.env.get("_TMDB_API_KEY") as string;
const supabase = createClient(supUrl, supKey, {db: { schema: 'persistence' }});

async function getSwipeRecommendationsMovie(req: Request): Promise<Response>  {
  

  const {user_id, movie_count} = await req.json()

  const resultGenres:number[] = [];
  const resultActors:number[] = [];

  // Liked Movies

  const { data: likedMovies, error: _errorLikedMovies } = await supabase
  .from("MovieStatus")
  .select("movie_id")
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

  // Genres der Liked Movies

  if (likedMovies && likedMovies.length > 0) {
    const promises = likedMovies.map(async (item) => {
      const { data: genresFromLikedMovie, error: _errorGenresFromLikedMovie } = await supabase
        .from("MovieGenre")
        .select("genre_id")
        .eq("movie_id", item.movie_id);
  
      if (genresFromLikedMovie && genresFromLikedMovie.length > 0) {
        const movieGenresAsNumberArray = genresFromLikedMovie.map(item => item.genre_id);
        movieGenresAsNumberArray.forEach(item => {
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

  // Actors der Liked Movies

  if (likedMovies && likedMovies.length > 0) {
    const promises = likedMovies.map(async (item) => {
      const { data: actorsFromLikedMovie, error: _errorActorsFromLikedMovie } = await supabase
        .from("MovieActor")
        .select("actor_id")
        .eq("movie_id", item.movie_id);
  
      if (actorsFromLikedMovie && actorsFromLikedMovie.length > 0) {
        const movieActorsAsNumberArray = actorsFromLikedMovie.map(item => item.actor_id);
        movieActorsAsNumberArray.forEach(item => {
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

  const resultMovies:any[] = await fetchMovies(user_id, movie_count, 1, actorsString, genresString );

  resultMovies.forEach((movie:any) =>{
    if(movie.overview.length === 0){
      //Hier wird eine Meldung gesetzt, falls der Overview leer ist.
      movie.overview = "Dieser Film enthält leider keine deutsche Beschreibung.";
    }
  });

  let result = [];

  // Anzahl zurueckgebender Filme beachten
  if(movie_count < resultMovies.length) {
    for (let i = 0; i < movie_count; i++) {
      let movie = resultMovies.pop();
      result.push(movie);
    }
  } else {
    resultMovies.forEach((movie:any) => {
      result.push(movie);
    });
  }

  const promises = result.map(async (item) => {
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
  await Promise.all(promises);


  return new Response(JSON.stringify(resultMovies), {
    headers: {
      "content-type": "application/json",
    },
  });
}


async function fetchMovies(
  user_id: number,
  movie_count: number,
  page: number,
  actorsString: string,
  genresString: string,
): Promise<any[]> {
  const fetchMoviesFromTMDB = async (page: number): Promise<any> => {
    const response = await fetch(
      `https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=de-DE&page=${page}&sort_by=popularity.desc${actorsString}${genresString}`,
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

  const getRatedMovies = async (user_id: number): Promise<number[]> => {
    const { data: ratedMovies, error: _errorRatedMovies } = await supabase
      .from("MovieStatus")
      .select("movie_id")
      .eq("user_id", user_id);

    return ratedMovies ? ratedMovies.map((movie: any) => movie.movie_id) : [];
  };

  const filterMovies = (movies: any[], ratedMovieId: number[]): any[] => {
    return movies.filter((movie: any) => !ratedMovieId.includes(movie.id));
  };

  const ratedMovieId = await getRatedMovies(user_id);
  let resultMovies: any[] = [];
  let currentPage = page;

  while (resultMovies.length < movie_count) {
    const movies = await fetchMoviesFromTMDB(currentPage);

    if (movies && movies.results && movies.results.length > 0) {
      const filteredMovies = filterMovies(movies.results, ratedMovieId);
      resultMovies = [...resultMovies, ...filteredMovies];
    } else {
      break; // Break the loop if no more movies are available
    }

    if (resultMovies.length >= movie_count) {
      resultMovies = resultMovies.slice(0, movie_count); // Ensure we return exactly movie_count movies
      break;
    }

    currentPage++;
  }

  return resultMovies;
}

Deno.serve(getSwipeRecommendationsMovie)
