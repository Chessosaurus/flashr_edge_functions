const tmdbKey = Deno.env.get("_TMDB_API_KEY") as string;

async function getWatchProviderTv(req: Request): Promise<Response>  {
  

  const {tv_id} = await req.json()

  let result;

  const watchProviderInfo = await fetch(`https://api.themoviedb.org/3/movie/${tv_id}/watch/providers`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${tmdbKey}`,
        Host: 'api.themoviedb.org'
      },
    })
  
  const watchProviderData = await watchProviderInfo.json();
  result = watchProviderData.results.DE;

  return new Response(JSON.stringify(result), {
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(getWatchProviderTv)
