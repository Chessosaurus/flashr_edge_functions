const tmdbKey = Deno.env.get("_TMDB_KEY") as string;

async function searchForTv(req: Request): Promise<Response>  {
  
  const {search, page} = await req.json()
  const query:string = search.replace(/ /g, '%');

  const response = await fetch(`https://api.themoviedb.org/3/search/tv?query=${query}&include_adult=false&language=de-DE&page=${page}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${tmdbKey}`,
      Host: 'api.themoviedb.org'
    },
  });

  const TVs = await response.json();

  const checkedTVs = TVs.results;

  checkedTVs.forEach((tv:any) => {
    if(tv.overview.length === 0){
      tv.overview = "Diese Serie enthält leider keine deutsche Beschreibung."
    }
  });

  return new Response(JSON.stringify(checkedTVs), {
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(searchForTv)