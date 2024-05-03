import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0"
import * as zlib from 'node:zlib';
import * as util from 'util';
const env = await load();
const tmdbKey = env["_TMDB_API_KEY"];
const supUrl = env["_SUPABASE_URL"];
const supKey = env["_SUPABASE_API_KEY"];

//const supUrl = Deno.env.get("_SUPABASE_URL") as string;
//const supKey = Deno.env.get("_SUPABASE_KEY") as string;
//const tmdbKey = Deno.env.get("_TMDB_KEY") as string;



const supabase = createClient(supUrl, supKey, { db: { schema: 'persistence' } });

const maxNumberOfTVsToAdd = 1000
const batchSize = 50;

let batch = 0
let addedTVs = 0
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
//Die aktuellst*e TV.json.gz von tmdb downloaden
const date = "05_03_2024"
const response = await fetch("http://files.tmdb.org/p/exports/tv_series_ids_" + date + ".json.gz")
//Die .gz entpacken und die einzelnen Einträge jeweils als String abspeichern
const buffer = await response.arrayBuffer();
const gzippedData = new Uint8Array(buffer);
const decompressed = zlib.gunzipSync(gzippedData);
const dataArray = decompressed.toString().split('\n');

const tvData: TVData[] = [];


async function initDB(req: Request): Promise<Response> {
  let tvIds = getTVIdsFromStringArray(dataArray);
  addedTVs = 0;
  batch = 0;
  begin = new Date()
  last = new Date();

  const tvsAlreadyInDB: UniqueSet<TVP> = new UniqueSet();

  await getTVsInDb().then(mL => {
    tvsAlreadyInDB.addAll(mL)
  })
  tvIds = tvIds.filter(function (el) {
    return !tvsAlreadyInDB.hasKey(el.toString());
  });

  //Diese Line macht, dass alle Serien geladen werden bumm
  tvIds = tvIds.splice(0, maxNumberOfTVsToAdd);

  await fetchDataContinously(tvIds);

  const end: Date = new Date()
  return new Response(`${addedTVs} were added in ${batch} Batches. It took ${new Date().getTime() - begin.getTime()}ms\n
    This results in ${(end.getTime() - begin.getTime()) / addedTVs}'ms/tv'`, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

async function getTVsInDb(): Promise<TVP[]> {
  const tvCount: number = await getTVCountInDB()
  const iterations = Math.ceil(tvCount / 1000)
  let tvList: TVP[] = []
  for (let i = 0; i < iterations; i++) {
    const { data, error } = await supabase
      .from("TV")
      .select("id")
      .range(i * 1000, i * 1000 + 999)
    tvList = tvList.concat(data as TVP[])
  }
  return tvList;
}
async function getTVCountInDB(): Promise<number> {
  const { count, error } = await supabase
    .from('TV')
    .select('*', { count: 'exact', head: true })
  return count!
}

async function addTVsToDB(tvs: TVP[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("TV")
    .upsert(tvs)
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

async function addTVActorsToDB(tvActors: TVActorP[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("TVActor")
    .upsert(tvActors)
    .select();
  if (error === null) {
    return true;
  }
  console.log(error)
  return true;
}
async function addTVGenresToDB(tvGenres: TVGenreP[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("TVGenre")
    .upsert(tvGenres)
    .select();
  if (error === null) {
    return true;
  }
  console.log(error)
  return true;
}
function getTVFromTVData(tvData: TVData): TVP {
  const id = tvData.id;
  let title = tvData.name;
  let overview = tvData.overview;
  const poster_path = tvData.poster_path

  const gerTranslation = tvData.translations.find(translation => translation.iso_3166_1 === "DE");
  const enTranslation = tvData.translations.find(translation => translation.iso_3166_1 === "US");

  if (gerTranslation) {
    title = gerTranslation.data.name != "" ? gerTranslation.data.name : title
    overview = gerTranslation.data.overview != "" ? gerTranslation.data.overview : overview
  } else if (enTranslation) {
    title = enTranslation.data.name != "" ? enTranslation.data.name : title
    overview = enTranslation.data.overview != "" ? enTranslation.data.overview : overview
  } else {
    title = tvData.original_name;
  }

  return ({ id, title, overview, original_title: tvData.original_name, poster_path, rating: tvData.vote_average}) as TVP;
}

function getActorsFromTVData(tvData: TVData): ActorP[] {
  const actors: ActorP[] = []
  tvData.cast.forEach(c => {
    if (c.known_for_department == "Acting") {
      //Check, so that no duplicates may be in the actors list
      if (!actors.includes({ id: c.id, name: c.name })) {
        actors.push({ id: c.id, name: c.name })
      }
    }
  })
  return actors;
}

function getGenresFromTVData(tvData: TVData): GenreP[] {
  const genres: GenreP[] = []
  tvData.genres.forEach(g => {
    genres.push({ id: g.id })
  })
  return genres
}

//Die TVData von TMDB holen und in das Lokale Interface TVData verpacken, gibt 1 zurück, wenn ein Fehler von TMDB zurückkommt
async function getTVData(tvId: number): Promise<TVData> {
  const response = await fetch(`https://api.themoviedb.org/3/tv/${tvId}?append_to_response=aggregate_credits,translations&language=us-US`, {
    method: 'GET',
    headers: {
      "Authorization": `Bearer ${tmdbKey}`,
      "Content-Type": "application/json"
    }
  });
  if (response.status != 200) {
    console.log(`TVDetail Error on ${tvId}`)
    return { id: -1, name: "", overview: "", original_name: "", poster_path: "", vote_average: 0, cast: [], genres: [], translations: [] }
  }
  const data = JSON.parse(JSON.stringify(await response.json()));
  const id: number = data.id;
  const name: string = data?.name
  const overview: string = data?.overview
  const original_name: string = data?.original_name
  const poster_path: string = data?.poster_path
  const vote_average: number = data?.vote_average
  const genres: Genre[] = data?.genres
  const cast: Cast[] = data?.aggregate_credits?.cast
  const translations: Translation[] = data?.translations?.translations
  const d: TVData = { id, name, overview, original_name, poster_path, vote_average, genres, cast, translations }
  //console.log(util.inspect(data, { showHidden: false, depth: 2, colors: true }))
  //console.log("\n-----------------------------------------------------\n")
  //console.log(util.inspect(d, { showHidden: false, depth: null, colors: true }))
  return d;
}


function getTVIdsFromStringArray(dataArray: string[]) {
  const ids: number[] = [];
  dataArray.forEach(d => {
    if (d != "") {
      ids.push(JSON.parse(d!).id)
    }
  })
  return ids;
}
async function fetchDataContinously(tvIds: number[]) {
  let i = 0;
  //let lastDate = new Date();
  for await (const data of fetchDataGenerator(tvIds)) {
    //console.log(new Date().getTime() - lastDate.getTime())
    //lastDate = new Date()
    if (data.id == -1) {
      continue;
    }
    if (data.id == -100) {
      if (tvData.length != 0) {
        await saveBatchToDB(tvData.splice(0, batchSize))
      }
    } else {
      tvData.push(data)
      i++;
      if (i == batchSize) {
        await saveBatchToDB(tvData.splice(0, batchSize));
        i = 0;
      }
    }
  }
}
async function* fetchDataGenerator(tvIds: number[]) {
  let id = 0;
  while (id < tvIds.length) {
    const data = getTVData(tvIds[id])
    yield data
    id++;
  }
  const val: TVData = { id: -100, name: "", overview: "", original_name: "", poster_path: "", vote_average: 0, cast: [], genres: [], translations: [] }
  yield val;
}
async function saveBatchToDB(mdata: TVData[]) {
  const tvs: UniqueSet<TVP> = new UniqueSet();
  const actors: UniqueSet<ActorP> = new UniqueSet();
  const tvActors: UniqueSet<TVActorP> = new UniqueSet();
  const tvGenres: UniqueSet<TVGenreP> = new UniqueSet();
  mdata.forEach(data => {
    tvs.add(getTVFromTVData(data))
    getActorsFromTVData(data).forEach(actor => {
      actors.add(actor)
      tvActors.add({ tv_id: data.id, actor_id: actor.id })
    })
    getGenresFromTVData(data).forEach(genre => {
      tvGenres.add({ tv_id: data.id, genre_id: genre.id })
    })
  })
  await addTVsToDB(tvs.toArray())
  await addActorsToDB(actors.toArray())
  await addTVActorsToDB(tvActors.toArray())
  await addTVGenresToDB(tvGenres.toArray())
  addedTVs += tvs.size()
  batch++
  console.log(`Batch Nr:${batch}\tTVs Added:${tvs.size()}\tTime for batch:${new Date().getTime() - last.getTime()}ms\tTotal time:${new Date().getTime() - begin.getTime()}ms`)
  last = new Date();
}

interface TVData {
  id: number
  name: string
  overview: string
  original_name: string
  poster_path: string
  vote_average: number
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
  name: string
}
interface Translation {
  iso_3166_1: string
  iso_639_1: string
  data: {
    overview: string
    tagline: string
    name: string
  }
}

interface TVP {
  id: number;
  title: string;
  overview: string
  original_title: string
  poster_path: string
  rating: number
}

interface ActorP {
  id: number
  name: string
}

interface GenreP {
  id: number
}

interface TVGenreP {
  tv_id: number
  genre_id: number
}

interface TVActorP {
  tv_id: number
  actor_id: number
}

function logTVData(md: TVData) {
  console.log(`
  Id: ${md.id}
  Name: ${md.name}
  O Name: ${md.original_name}
  Cast (amount) : ${md.cast.toString()}
  Genres : ${md.genres.toString()}
  Translations (amount) : ${md.translations.toString()}
  `)
}

Deno.serve(initDB)