const tmdbKey = Deno.env.get("_TMDB_API_KEY") as string;

async function getExtraInfoTv(req: Request): Promise<Response>  {
  

  const {tv_id} = await req.json()

  let result:any = {};

  const watchProviderInfo = await fetch(`https://api.themoviedb.org/3/tv/${tv_id}/watch/providers`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${tmdbKey}`,
        Host: 'api.themoviedb.org'
      },
    })
  
  const watchProviderData = await watchProviderInfo.json();
  result.watch_provider = watchProviderData.results.DE;

  //Runtime and Releasedate
  const tvDetailInfo = await fetch(`https://api.themoviedb.org/3/tv/${tv_id}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${tmdbKey}`,
      Host: 'api.themoviedb.org'
    },
  })

const tvDetailData = await tvDetailInfo.json();
result.runtime = tvDetailData.episode_run_time;
result.release_date = tvDetailData.first_air_date;

  return new Response(JSON.stringify(result), {
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(getExtraInfoTv)
