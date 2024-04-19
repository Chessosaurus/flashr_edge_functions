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

  let count = 0;
  const countLimit = 2;
  const maxMovies = 10
  let locked = false;
  const moviesToAdd: Movie[] = [];
  const actorsToAdd: Actor[] = [];
  const movieActorToAdd: MovieActor[] = [];
  const movieGenreToAdd: MovieGenre[] = [];
  for (let i = 0; i <= maxMovies; i++) {//
    try {
      //while (locked) {locked = (i >= maxMovies)}
      console.log(i)
      const jsonObject = JSON.parse(DataArray[i]);
      const idValue: number = jsonObject.id;
      /*if (count == countLimit) {
        locked = true
      }*/
      count++;
      countMoviesAdded++;
      //Checks if the Movie is already in the Database
      await isMovieInDB(idValue).then(isInDB => {
        if (!isInDB) {
          //Gets the MovieData from TMDB
          getMovieData(idValue).then(movieData => {
            //Adds the DataSets to the arrays for a bulk insert
            addDataToLists(movieData, moviesToAdd, actorsToAdd, movieActorToAdd, movieGenreToAdd)
            if (count >= countLimit) {
              //Bulk insert into the Database
              addAllToDB(moviesToAdd, actorsToAdd, movieActorToAdd, movieGenreToAdd).then(_x => {
                count = 0;
                locked = false;
              });
            }
          })
        }
      })
    } catch (error) {
      console.log(`Line ${i} had the error:\n${error}`)
    }
  }

  return new Response(`Movies added to the Database:` + countMoviesAdded, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
async function isMovieInDB(movieId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from("Movie")
    .select()
    .eq("id", movieId)
  return data?.length != 0;
}
function addDataToLists(movieData: MovieData, movies: Movie[], actors: Actor[], movieActors: MovieActor[], movieGenres: MovieGenre[]) {
  //Add the Movie to the movies List
  movies.push({ id: movieData.id })
  //Add the Actors to the List
  const actorsInMovie: Actor[] = getActorsFromMovieData(movieData)
  addActorsToList(actors, actorsInMovie)
  //Add the MovieActors to the List
  addMovieActorsToList(movieActors, movieData.id, actorsInMovie)
  //Add the MovieGenres to the List
  const genres = getGenresFromMovieData(movieData)
  addMovieGenreToList(movieGenres, movieData.id, genres)
}
function addActorsToList(actors: Actor[], actorsToAdd: Actor[]) {
  actorsToAdd.forEach(a => {
    if (!actors.includes(a)) {
      actors.push(a)
    }
  })
}
function addMovieActorsToList(movieActors: MovieActor[], movieId: number, actors: Actor[]) {
  actors.forEach(a => {
    movieActors.push({ movie_id: movieId, actor_id: a.id })
  })
}
function addMovieGenreToList(movieGenres: MovieGenre[], movieId: number, genres: Genre[]) {
  genres.forEach(g => {
    movieGenres.push({ movie_id: movieId, genre_id: g.id })
  })
}

async function addAllToDB(movies: Movie[], actors: Actor[], movieActors: MovieActor[], movieGenres: MovieGenre[]): Promise<void> {
  //Add all Movies to the DB and clear the Array
  addMoviesToDB(movies).then(
    //Add all Actors to the DB and clear the Array
    _x => addActorsToDB(actors).then(
      //Add all MovieActors to the DB and clear the Array
      _x => addMovieActorsToDB(movieActors).then(
        //Add all MovieGenres to the DB and cler the Array
        _x => addMovieGenresToDB(movieGenres).then(_x => {
          //Reset DB State
          console.log(`MOVIES ADDED:${movies.length} \nACTORS ADDED:${actors.length} \nMOVIEACTORS ADDED:${movieActors.length} \n MOVIEGENRES ADDED: ${movieGenres.length}`)
          movies = []
          actors = []
          logActors(actors)
          movieActors = []
          movieGenres = []
        })
      )))
}

async function addMoviesToDB(movies: Movie[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("Movie")
    .upsert(movies)
    .select();
  if (error === null) {
    return true;
  }
  console.log("MOVIES ERROR")
  console.log(error)
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
  console.log("ACTORS ERROR")
  console.log(error)
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
  console.log("MOVIEACTOR ERROR")
  console.log(error)
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
  console.log("MOVIEGENRE ERROR")
  console.log(error)
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
Deno.serve(initDB);

function logMovieActors(movieActors: MovieActor[]) {
  movieActors.forEach(a => console.log(a))
}
function logMovieGenres(movieGenres: MovieGenre[]) {
  movieGenres.forEach(g => console.log(g))
}
function logActors(actors: Actor[]) {
  actors.forEach(a => console.log(a))
}
function logGenres(genres: Genre[]) {
  genres.forEach(g => console.log(g))
}
