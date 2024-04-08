async function getMovieTrailer(req: Request): Promise<Response> {

  const { tmdb_id } = await req.json()

  const resp = await fetch("https://api.kinocheck.de/movies?tmdb_id="+tmdb_id, {
    headers: {
      Accept: 'application/json',
    },
  });
  return new Response(resp.body, {
    status: resp.status,
    headers: {
      "content-type": "application/json",
    },
  });
}


Deno.serve(getMovieTrailer);