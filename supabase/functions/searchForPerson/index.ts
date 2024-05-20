const tmdbKey = Deno.env.get("_TMDB_API_KEY") as string;

async function searchForTv(req: Request): Promise<Response>  {
  
  const {search, page} = await req.json()
  const query:string = search.replace(/ /g, '%');

  const response = await fetch(`https://api.themoviedb.org/3/search/person?query=${query}&include_adult=false&language=de-DE&page=${page}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${tmdbKey}`,
      Host: 'api.themoviedb.org'
    },
  });

  const people = await response.json();

  const filteredResults = people.results.filter((result: any) => result.known_for_department === "Acting");


  return new Response(JSON.stringify(filteredResults), {
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(searchForTv)
