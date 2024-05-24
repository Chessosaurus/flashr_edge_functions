const tmdbKey = Deno.env.get("_TMDB_API_KEY") as string;

async function getExtraInfoTv(req: Request): Promise<Response>  {
  

  const {movie_id} = await req.json()

  let result:any = {};

  //Watchprovider
  const watchProviderInfo = await fetch(`https://api.themoviedb.org/3/movie/${movie_id}/watch/providers`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${tmdbKey}`,
        Host: 'api.themoviedb.org'
      },
    })
  
  const watchProviderData = await watchProviderInfo.json();
  result.watch_provider = watchProviderData.results.DE;
  
  //Runtime and Releasedate
  const movieDetailInfo = await fetch(`https://api.themoviedb.org/3/movie/${movie_id}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${tmdbKey}`,
        Host: 'api.themoviedb.org'
      },
    })
  
  const movieDetailData = await movieDetailInfo.json();
  result.runtime = movieDetailData.runtime;
  result.release_date = movieDetailData.release_date;


  return new Response(JSON.stringify(result), {
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(getExtraInfoTv)
