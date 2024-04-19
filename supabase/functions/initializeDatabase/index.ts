import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0"
import * as zlib from 'node:zlib';
//const {gzip, ungzip} = require('node-gzip')
//const {gzip, ungzip} = require('node-gzip');
const env = await load();
const tmdbKey = env["_TMDB_API_KEY"];
const supUrl = env["_SUPABASE_URL"];
const supKey = env["_SUPABASE_API_KEY"];
const supabase = createClient(supUrl, supKey, { db: { schema: 'persistence' } });

async function initDB(req: Request): Promise<Response> {
  const date = "04_16_2024";
  let countMoviesAdded = 0;
  //Die aktuellse Movie.json.gz von tmdb downloaden
  const response = await fetch("http://files.tmdb.org/p/exports/movie_ids_" + date + ".json.gz")
  //Die .gz entpacken und die einzelnen Einträge jeweils als String abspeichern
  const buffer = await response.arrayBuffer();
  const gzippedData = new Uint8Array(buffer);
  const decompressed = zlib.gunzipSync(gzippedData);
  const DataArray = decompressed.toString().split('\n');

  //Für alle FilmId's checken ob vorhanden, falls nicht hinzufügen und Verbindungen erstellen
  for (let i = 0; i < 1000; i++) {//
    try {
      const jsonObject = JSON.parse(DataArray[i]);
      const idValue: number = jsonObject.id;
      //Check if Movie is in DB, else add it
      if(! await movieInDB(idValue)){
        getMovieData(idValue).then(mergeMovieIntoDB)
        countMoviesAdded++
      }
    } catch (error) {
      console.log(`Line ${i} had the error:\n${error}`)
    }
  }

  return new Response(`Movies added to the Database:${countMoviesAdded}`, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

async function mergeMovieIntoDB(credits: MovieData) {
  const actors = getActorsFromMovieData(credits)
  //MERGE ALL ACTORs INTO Actor
  const actorsAdded = await upsertActors(actors);
  if(!actorsAdded){
    rollbackForMovieId(credits.id)
    throw new Error(`An error has occured while adding the Actors for MovieId `+ credits.id)
  }
  //INSERT ALL MOVIEs AND ACTORs INTO MovieActor
  const movieActorsAdded = await addMovieActors(credits.id, actors)
  if(!movieActorsAdded){
    rollbackForMovieId(credits.id)
    throw new Error(`An error has occured while adding the MovieActors for MovieId `+ credits.id)
  }
  //INSERT MOVIE AND ALL GENREs INTO MovieGenre
  const movieGenreAdded = await addMovieGenre(credits);
  if(!movieGenreAdded){
    rollbackForMovieId(credits.id)
    throw new Error(`An error has occured while adding the MovieGenres for MovieId `+ credits.id)
  }
}
//Deletes Movie from the DB and cascades its relations
async function rollbackForMovieId(movieId : number){
  const {data,error} = await supabase
    .from("Movie")
    .delete()
    .eq("id",movieId)
}
//returns true, if no error occured
async function addMovieGenre(movieData : MovieData): Promise<boolean>{
  interface MovieGenre{
    movie_id : number
    genre_id : number
  }
  const mGenre : MovieGenre[] = []
  movieData.genres.forEach(g=>{
    mGenre.push({movie_id : movieData.id,genre_id : g.id})
  })
  const {data,error} = await supabase
    .from("MovieGenre")
    .upsert(mGenre)
    .select("movie_id, genre_id");
    if(error === null) return true;
    console.log(error)
    return false;
}
//returns true, if no error occured
async function addMovieActors(movieId : number, actors : Actor[]) : Promise<boolean>{
  interface MovieActor{
    movie_id : number
    actor_id : number
  }
  const mActors : MovieActor[] = []
  actors.forEach(a=>{
    mActors.push({movie_id : movieId, actor_id : a.id})
  })
  const {data,error} = await supabase
    .from("MovieActor")
    .upsert(mActors)
    .select("movie_id, actor_id");
    if(error === null) return true;
    console.log(error)
    return false;
}
//Returns true if no error occured
async function upsertActors(actors: Actor[]): Promise<boolean>{
  const { data,error} = await supabase
    .from("Actor")
    .upsert(actors)
    .select("id");
  if(error === null) return true;
  console.log(error)
  return false;
}
//Checks if the movie is in the Database, else adds it to it
//True if already in DB, false if not
async function movieInDB(movieId: number): Promise<boolean> {
  const {data,error,status } = await supabase
    .from("Movie")
    .upsert({ id: movieId })
    .select("id");
  
  //If Movie was created the status is 201, if it was already in the db it is 200
  return status == 200;
}
function getActorsFromMovieData(movieData: MovieData): Actor[] {
  const actors: Actor[] = []
  movieData.cast.forEach(c => {
    if (c.known_for_department == "Acting") {
      //Check, so that no duplicates may be in the actors list
      if(!actors.includes({id : c.id})){
        actors.push({ id: c.id })
      }
    }
  })
  return actors;
}
//Die MovieData von TMDB holen und in das Lokale Interface MovieData verpacken
async function getMovieData(movieId: number): Promise<MovieData> {
  const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?append_to_response=credits&language=en-US`, {
    method: 'GET',
    headers: {
      "Authorization": `Bearer ${tmdbKey}`,
      "Content-Type": "application/json"
    }
  });
  const data = JSON.parse(JSON.stringify(await response.json()));
  const id: number = data.id;
  const genres: { id: number }[] = data.genres;
  const cast: { id: number; known_for_department: string }[] = data.credits.cast;
  return { id, genres, cast }
}
interface MovieData {
  id: number
  genres: { id: number }[]
  cast: { id: number, known_for_department: string }[]
}
interface Actor {
  id: number
}

function logActors(actors : Actor[]){
  actors.forEach(a=>console.log(a.id))
}
Deno.serve(initDB);