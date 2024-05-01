//import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0"
import * as zlib from 'node:zlib';
//const env = await load();
//const tmdbKey = env["_TMDB_API_KEY"];
//const supUrl = env["_SUPABASE_URL"];
//const supKey = env["_SUPABASE_API_KEY"];

const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_KEY") as string;
const tmdbKey = Deno.env.get("_TMDB_KEY") as string;

const supabase = createClient(supUrl, supKey, { db: { schema: 'persistence' } });
const maxNumberOfMoviesToAdd = 10
let batch = 0
let addedMovies = 0
const batchSize = 2;

class UniqueSet<T> {
  private items: Map<string, T>;

  constructor() {
    this.items = new Map<string, T>();
  }

  add(item: T): void {
    // Assuming T has an 'id' property of type number
    const key = JSON.stringify(item)
    if (!this.items.has(key)) {
      this.items.set(key, item);
    }
  }
  addAll(item: T[]) {
    item.forEach(i => this.add(i));
  }

  toArray(): T[] {
    return Array.from(this.items.values());
  }
  size(): number {
    return this.items.size;
  }
  clear(): void {
    this.items.clear
  }
  hasItem(item: T): boolean {
    return this.items.has(JSON.stringify(item))
  }
}
  //Die aktuellse Movie.json.gz von tmdb downloaden
  const date = "04_16_2024";
  const response = await fetch("http://files.tmdb.org/p/exports/movie_ids_" + date + ".json.gz")
  //Die .gz entpacken und die einzelnen Einträge jeweils als String abspeichern
  const buffer = await response.arrayBuffer();
  const gzippedData = new Uint8Array(buffer);
  const decompressed = zlib.gunzipSync(gzippedData);
  const dataArray = decompressed.toString().split('\n');


async function initDB(req: Request): Promise<Response> {
  addedMovies = 0;
  batch = 0;
  const begin: Date = new Date()
  let last: Date = new Date();

  const moviesInDBLocal: UniqueSet<Movie> = new UniqueSet<Movie>();

  await getMoviesInDb().then(mL => {
    moviesInDBLocal.addAll(mL)
  })

  while (maxNumberOfMoviesToAdd > addedMovies) {
    //Gets batchSize elements of MovieData
    const toProcess: MovieData[] = await getBatchSizeOfUnknownMovieDataFromDataArray(dataArray, Math.min(batchSize, (maxNumberOfMoviesToAdd - addedMovies)), moviesInDBLocal);
    const movies: UniqueSet<Movie> = new UniqueSet<Movie>();
    const actors: UniqueSet<Actor> = new UniqueSet<Actor>();
    const movieActors: UniqueSet<MovieActor> = new UniqueSet<MovieActor>();
    const movieGenres: UniqueSet<MovieGenre> = new UniqueSet<MovieGenre>();
    //Fill the Sets with Data
    while (toProcess.length > 0) {
      const data: MovieData = toProcess.pop()!;
      movies.add({ id: data.id })
      moviesInDBLocal.add({ id: data.id })
      getActorsFromMovieData(data).forEach(actor => {
        actors.add({ id: actor.id })
        movieActors.add({ movie_id: data.id, actor_id: actor.id })
      })
      getGenresFromMovieData(data).forEach(genre => {
        movieGenres.add({ movie_id: data.id, genre_id: genre.id })
      })
    }
    //Add all the Data into the Database
    await addMoviesToDB(movies.toArray())
    await addActorsToDB(actors.toArray())
    await addMovieActorsToDB(movieActors.toArray())
    await addMovieGenresToDB(movieGenres.toArray())
    //Add Movies to moviesInDB
    //Logs the batch and how many movies were added
    addedMovies += movies.size()
    batch++
    console.log(`Batch Nr:${batch}\tMovies Added:${movies.size()}\tTime for batch:${new Date().getTime() - last.getTime()}ms\tTotal time:${new Date().getTime() - begin.getTime()}ms`)
    last = new Date();
    movies.clear()
    actors.clear()
    movieActors.clear()
    movieGenres.clear()
  }
  const end: Date = new Date()
  return new Response(`${addedMovies} were added in ${batch} Batches. It took ${end.getTime() - begin.getTime()}ms\n
  This results in ${(end.getTime() - begin.getTime()) / addedMovies}'ms/movie'`, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
async function getBatchSizeOfUnknownMovieDataFromDataArray(dataArray: string[], batchSize: number, knownMovies: UniqueSet<Movie>): Promise<MovieData[]> {
  const movieData: MovieData[] = [];
  //Hier noch optimieren, wie oft die Filme aus der Datenbank gelesen werden
  //const moviesInDB = await getMoviesInDb()
  //logMovies(knownMovies.toArray())
  while (movieData.length < batchSize) {
    const value = dataArray.pop();
    if (value == "") { continue; }
    const jsonObject = JSON.parse(value!);
    const idValue: number = jsonObject.id
    console.log(idValue)
    console.log(knownMovies.hasItem({ id: idValue }))
    if (knownMovies.hasItem({ id: idValue })) { continue; }
    //if (knownMovies.hasKey(idValue)) { continue; }
    const data: MovieData = await getMovieData(idValue)
    if (data.id == -1) { continue; }
    movieData.push(data)
  }
  return movieData;
}

async function getMoviesInDb(): Promise<Movie[]> {
  const { data, error } = await supabase
    .from("Movie")
    .select("id")
  return data as Movie[];
}

async function addMoviesToDB(movies: Movie[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("Movie")
    .upsert(movies)
    .select();
  if (error === null) {
    return true;
  }
  console.log(error)
  logMovies(movies)
  return true;
}

async function addActorsToDB(actors: Actor[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("Actor")
    .upsert(actors)
    .select();
  if (error === null) {
    return true;
  }
  console.log(error)
  logActors(actors)
  return true;
}

async function addMovieActorsToDB(movieActors: MovieActor[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("MovieActor")
    .upsert(movieActors)
    .select();
  if (error === null) {
    return true;
  }
  console.log(error)
  logMovieActors(movieActors)
  return true;
}
async function addMovieGenresToDB(movieGenres: MovieGenre[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("MovieGenre")
    .upsert(movieGenres)
    .select();
  if (error === null) {
    return true;
  }
  console.log(error)
  logMovieGenres(movieGenres)
  return true;
}

function getActorsFromMovieData(movieData: MovieData): Actor[] {
  const actors: Actor[] = []
  movieData.cast.forEach(c => {
    if (c.known_for_department == "Acting") {
      //Check, so that no duplicates may be in the actors list
      if (!actors.includes({ id: c.id })) {
        actors.push({ id: c.id })
      }
    }
  })
  return actors;
}

function getGenresFromMovieData(movieData: MovieData): Genre[] {
  const genres: Genre[] = []
  movieData.genres.forEach(g => { genres.push({ id: g.id }) })
  return genres
}

//Die MovieData von TMDB holen und in das Lokale Interface MovieData verpacken, gibt 1 zurück, wenn ein Fehler von TMDB zurückkommt
async function getMovieData(movieId: number): Promise<MovieData> {
  const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?append_to_response=credits&language=en-US`, {
    method: 'GET',
    headers: {
      "Authorization": `Bearer ${tmdbKey}`,
      "Content-Type": "application/json"
    }
  });
  if (response.status != 200) { return { id: -1, cast: [], genres: [] } }
  const data = JSON.parse(JSON.stringify(await response.json()));
  const id: number = data.id;
  let genres: { id: number }[]
  let cast: { id: number; known_for_department: string }[]
  try {
    genres = data.genres;
  } catch (error) {
    console.log(`${movieId} has a genre error`)
    genres = []
  }
  try {
    cast = data.credits.cast;
  }
  catch (error) {
    console.log(`${movieId} has a credits error`)
    cast = []
  }
  return { id, genres, cast }
}

interface MovieData {
  id: number
  genres: { id: number }[]
  cast: { id: number, known_for_department: string }[]
}

interface Movie {
  id: number;
}

interface Actor {
  id: number
}

interface Genre {
  id: number
}

interface MovieGenre {
  movie_id: number
  genre_id: number
}

interface MovieActor {
  movie_id: number
  actor_id: number
}

function logMovieActors(movieActors: MovieActor[]) {
  console.log("MovieActor-----------------------------")
  movieActors.forEach(a => console.log(a))
  console.log("---------------------------------------")
}
function logMovieGenres(movieGenres: MovieGenre[]) {
  console.log("MovieGenre-----------------------------")
  movieGenres.forEach(g => console.log(g))
  console.log("---------------------------------------")
}
function logActors(actors: Actor[]) {
  console.log("Actor----------------------------------")
  actors.forEach(a => console.log(a))
  console.log("---------------------------------------")
}
function logGenres(genres: Genre[]) {
  console.log("Genre----------------------------------")
  genres.forEach(g => console.log(g))
  console.log("---------------------------------------")
}
function logMovies(movies: Movie[]) {
  console.log("Movie----------------------------------")
  movies.forEach(m => console.log(m))
  console.log("---------------------------------------")
}

Deno.serve(initDB);