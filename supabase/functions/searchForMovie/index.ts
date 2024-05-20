const tmdbKey = Deno.env.get("_TMDB_API_KEY") as string;

async function searchForMovie(req: Request): Promise<Response>  {
  
  const {search, page} = await req.json()
  const query:string = search.replace(/ /g, '%');

  const response = await fetch(`https://api.themoviedb.org/3/search/movie?query=${query}&include_adult=false&language=de-DE&page=${page}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${tmdbKey}`,
      Host: 'api.themoviedb.org'
    },
  });

  const movies = await response.json();

  const checkedMovies = movies.results;

  checkedMovies.forEach((movie:any) => {
    if(movie.overview.length === 0){
      movie.overview = "Dieser Film enthält leider keine deutsche Beschreibung."
    }
  });

  return new Response(JSON.stringify(checkedMovies), {
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(searchForMovie)