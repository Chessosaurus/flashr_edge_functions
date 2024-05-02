import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0"
import * as zlib from 'node:zlib';
import * as util from 'util';

const env = await load();
const tmdbKey = env["_TMDB_API_KEY"];
const supUrl = env["_SUPABASE_URL"];
const supKey = env["_SUPABASE_API_KEY"];
const supabase = createClient(supUrl, supKey, { db: { schema: 'persistence' } });

const maxNumberOfMoviesToAdd = 100
const batchSize = 50;

let batch = 0
let addedMovies = 0
let begin: Date
let last: Date


class UniqueSet<T extends Object> {
  private items: Map<string, T>;

  constructor() {
    this.items = new Map<string, T>();
  }

  add(item: T): void {
    const keys = Object.keys(item)
    let key: string = "";
    key += item[keys[0] as keyof typeof item]
    for (let k = 1; k < keys.length; k++) {
      key += `_${item[keys[k] as keyof typeof item]}`
    }
    if (!this.hasKey(key)) {
      this.items.set(key, item)
    }
  }
  addAll(item: T[]) {
    item.forEach(i => {
      this.add(i)
    })
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
  hasKey(key: string): boolean {
    return this.items.has(key)
  }
  remove(key: string) {
    this.items.delete(key)
  }
  getFifty(): T[] {
    return this.toArray().slice(0, 50);
  }
}
//Die aktuellse Movie.json.gz von tmdb downloaden
const date = "05_02_2024";
const response = await fetch("http://files.tmdb.org/p/exports/movie_ids_" + date + ".json.gz")
//Die .gz entpacken und die einzelnen Einträge jeweils als String abspeichern
const buffer = await response.arrayBuffer();
const gzippedData = new Uint8Array(buffer);
const decompressed = zlib.gunzipSync(gzippedData);
const dataArray = decompressed.toString().split('\n');

const movieData: MovieData[] = [];


async function initDB(req: Request): Promise<Response> {
  let movieIds = getMovieIdsFromStringArray(dataArray);
  addedMovies = 0;
  batch = 0;
  begin = new Date()
  last = new Date();

  const moviesAlreadyInDB: UniqueSet<MovieP> = new UniqueSet();

  await getMoviesInDb().then(mL => {
    moviesAlreadyInDB.addAll(mL)
  })
  movieIds = movieIds.filter(function (el) {
    return !moviesAlreadyInDB.hasKey(el.toString());
  });
  //Diese Line macht, dass alle Filme geladen werden bumm
  //movieIds = movieIds.splice(0, maxNumberOfMoviesToAdd);

  await fetchDataContinously(movieIds);

  const end: Date = new Date()
  return new Response(`${addedMovies} were added in ${batch} Batches. It took ${new Date().getTime() - begin.getTime()}ms\n
    This results in ${(end.getTime() - begin.getTime()) / addedMovies}'ms/movie'\n
    Total MovieData:${movieData.length}`, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

async function getMoviesInDb(): Promise<MovieP[]> {
  const movieCount: number = await getMovieCountInDB()
  const iterations = Math.ceil(movieCount / 1000)
  let movieList: MovieP[] = []
  for (let i = 0; i < iterations; i++) {
    const { data, error } = await supabase
      .from("Movie")
      .select("id")
      .range(i * 1000, i * 1000 + 999)
    movieList = movieList.concat(data as MovieP[])
  }
  return movieList;
}
async function getMovieCountInDB(): Promise<number> {
  const { count, error } = await supabase
    .from('Movie')
    .select('*', { count: 'exact', head: true })
  return count!
}

async function addMoviesToDB(movies: MovieP[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("Movie")
    .upsert(movies)
    .select();
  if (error === null) {
    return true;
  }
  console.log(error)
  return true;
}

async function addActorsToDB(actors: ActorP[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("Actor")
    .upsert(actors)
    .select();
  if (error === null) {
    return true;
  }
  console.log(error)
  return true;
}

async function addMovieActorsToDB(movieActors: MovieActorP[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("MovieActor")
    .upsert(movieActors)
    .select();
  if (error === null) {
    return true;
  }
  console.log(error)
  return true;
}
async function addMovieGenresToDB(movieGenres: MovieGenreP[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("MovieGenre")
    .upsert(movieGenres)
    .select();
  if (error === null) {
    return true;
  }
  console.log(error)
  return true;
}
function getMovieFromMovieData(movieData: MovieData): MovieP {
  const id = movieData.id;
  let title = movieData.title;
  let overview = movieData.overview;
  const poster_path = movieData.poster_path

  const gerTranslation = movieData.translations.find(translation => translation.iso_3166_1 === "DE");
  const enTranslation = movieData.translations.find(translation => translation.iso_3166_1 === "US");

  if (gerTranslation) {
    title = gerTranslation.data.title != "" ? gerTranslation.data.title : title
    overview = gerTranslation.data.overview!= "" ? gerTranslation.data.overview : overview
  } else if (enTranslation) {
    title = enTranslation.data.title!= "" ? enTranslation.data.title : title
    overview = enTranslation.data.overview!= "" ? enTranslation.data.overview : overview
  } else {
    title = movieData.original_title;
  }

  return { id, original_title: movieData.original_title,poster_path, title, overview };
}

function getActorsFromMovieData(movieData: MovieData): ActorP[] {
  const actors: ActorP[] = []
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

function getGenresFromMovieData(movieData: MovieData): GenreP[] {
  const genres: GenreP[] = []
  movieData.genres.forEach(g => {
    genres.push({ id: g.id })
  })
  return genres
}

//Die MovieData von TMDB holen und in das Lokale Interface MovieData verpacken, gibt 1 zurück, wenn ein Fehler von TMDB zurückkommt
async function getMovieData(movieId: number): Promise<MovieData> {
  const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?append_to_response=credits,translations&language=us-US`, {
    method: 'GET',
    headers: {
      "Authorization": `Bearer ${tmdbKey}`,
      "Content-Type": "application/json"
    }
  });
  if (response.status != 200) { return { id: -1, title: "", overview: "", original_title: "",poster_path: "", cast: [], genres: [], translations: [] } }
  const data = JSON.parse(JSON.stringify(await response.json()));
  const id: number = data.id;
  const title: string = data.title
  const overview: string = data.overview
  const original_title: string = data?.original_title
  const poster_path : string = data?.poster_path
  const genres: Genre[] = data?.genres
  const cast: Cast[] = data?.credits?.cast
  const translations: Translation[] = data?.translations?.translations
  const d: MovieData = { id, title, overview, original_title,poster_path, genres, cast, translations }
  //console.log(util.inspect(data, { showHidden: false, depth: null, colors: true }))
  //console.log("\n-----------------------------------------------------\n")
  //console.log(util.inspect(d, { showHidden: false, depth: null, colors: true }))
  return d;
}


function getMovieIdsFromStringArray(dataArray: string[]) {
  const ids: number[] = [];
  dataArray.forEach(d => {
    if (d != "") {
      ids.push(JSON.parse(d!).id)
    }
  })
  return ids;
}
async function fetchDataContinously(movieIds: number[]) {
  let i = 0;
  //let lastDate = new Date();
  for await (const data of fetchDataGenerator(movieIds)) {
    //console.log(new Date().getTime() - lastDate.getTime())
    //lastDate = new Date()
    if (data.id == -100) {
      if (movieData.length != 0) {
        await saveBatchToDB(movieData.splice(0, batchSize))
      }
    } else {
      movieData.push(data)
      i++;
      if (i == batchSize) {
        await saveBatchToDB(movieData.splice(0, batchSize));
        i = 0;
      }
    }
  }
}
async function* fetchDataGenerator(movieIds: number[]) {
  let id = 0;
  while (id < movieIds.length) {
    const data = getMovieData(movieIds[id])
    yield data
    id++;
  }
  const val: MovieData = { id: -100, title: "", overview: "", original_title: "",poster_path : "", cast: [], genres: [], translations: [] }
  yield val;
}
async function saveBatchToDB(mdata: MovieData[]) {
  const movies: UniqueSet<MovieP> = new UniqueSet();
  const actors: UniqueSet<ActorP> = new UniqueSet();
  const movieActors: UniqueSet<MovieActorP> = new UniqueSet();
  const movieGenres: UniqueSet<MovieGenreP> = new UniqueSet();
  mdata.forEach(data => {
    movies.add(getMovieFromMovieData(data))
    getActorsFromMovieData(data).forEach(actor => {
      actors.add(actor)
      movieActors.add({ movie_id: data.id, actor_id: actor.id })
    })
    getGenresFromMovieData(data).forEach(genre => {
      movieGenres.add({ movie_id: data.id, genre_id: genre.id })
    })
  })
  await addMoviesToDB(movies.toArray())
  await addActorsToDB(actors.toArray())
  await addMovieActorsToDB(movieActors.toArray())
  await addMovieGenresToDB(movieGenres.toArray())
  addedMovies += movies.size()
  batch++
  console.log(`Batch Nr:${batch}\tMovies Added:${movies.size()}\tTime for batch:${new Date().getTime() - last.getTime()}ms\tTotal time:${new Date().getTime() - begin.getTime()}ms`)
  last = new Date();
}

interface MovieData {
  id: number
  title: string
  overview: string
  original_title: string
  poster_path: string
  genres: Genre[]
  cast: Cast[]
  translations: Translation[]
}
interface Genre {
  id: number;
}
interface Cast {
  id: number
  known_for_department: string
}
interface Translation {
  iso_3166_1: string
  iso_639_1: string
  data: {
    overview: string
    tagline: string
    title: string
  }
}

interface MovieP {
  id: number;
  title: string;
  overview: string
  original_title: string
  poster_path : string
}

interface ActorP {
  id: number
}

interface GenreP {
  id: number
}

interface MovieGenreP {
  movie_id: number
  genre_id: number
}

interface MovieActorP {
  movie_id: number
  actor_id: number
}

function logMovieData(md: MovieData) {
  console.log(`
  Id: ${md.id}
  Cast (amount) : ${md.cast.length}
  Genres : ${md.genres.toString()}
  Translations (amount) : ${md.translations.length}
  `)
}

Deno.serve(initDB)