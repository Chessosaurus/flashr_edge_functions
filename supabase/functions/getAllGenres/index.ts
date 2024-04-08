async function getAllGenres(): Promise<Response> {
  const movieGenreResp = await fetch("https://api.themoviedb.org/3/genre/movie/list", {
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3MzM2ZDExMGY1YjRlMDY5NTc1ZDFiNzdiMTMzMmM2YSIsInN1YiI6IjY1ZmQ1OWI2MjI2YzU2MDE2NDZlZGMwOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.81HUBUnUJvJD9qHxOxS7a0hkFumc3AqC6v52b8wWesM',
      Host: 'api.themoviedb.org'
    },
  });

  const tvGenreResp = await fetch("https://api.themoviedb.org/3/genre/tv/list", {
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3MzM2ZDExMGY1YjRlMDY5NTc1ZDFiNzdiMTMzMmM2YSIsInN1YiI6IjY1ZmQ1OWI2MjI2YzU2MDE2NDZlZGMwOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.81HUBUnUJvJD9qHxOxS7a0hkFumc3AqC6v52b8wWesM',
      Host: 'api.themoviedb.org'
    },
  });


  const movieGenres = await movieGenreResp.json()
  const tvGenres = await tvGenreResp.json()
  
  const mergedGenres = {movieGenres: movieGenres.genres, tvGenres: tvGenres.genres}

  return new Response(JSON.stringify(mergedGenres), {
    status:200,
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve(getAllGenres);


export interface  IGenre {
  id: number,
  name: string
}