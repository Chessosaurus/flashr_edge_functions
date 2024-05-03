const tmdbKey = Deno.env.get("_TMDB_KEY") as string;

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

  return new Response(JSON.stringify(movies), {
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(searchForMovie)