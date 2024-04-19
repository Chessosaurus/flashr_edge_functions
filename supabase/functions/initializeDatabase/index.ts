import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";
import {ungzip} from 'node-gzip';
//const {gzip, ungzip} = require('node-gzip');
const env = await load();
const tmdbKey = ''
async function initDB(req: Request): Promise<Response> {
  //Ablauf: Die gz Datei von tmdb runterladen
  const date = "04_16_2024";
  //const tmdbKey = Deno.env.get("_TMDB_API_KEY");
  console.log(tmdbKey)
  const resp = await fetch("http://files.tmdb.org/p/exports/movie_ids_" + date + ".json.gz")

  const data = uncompress(resp.body);
  console.log(data);
  return new Response(null, {
    status: resp.status,
    headers: {
      "content-type": "application/json",
    },
  });
}
function uncompress(zipped : any) : Promise<JSON>{
  return ungzip(zipped).toSring()
}
//gz in json extrahieren

//Für alle Einträge in der Datei schauen, on in Lokaler DB vorhanden
//Wenn nicht die Details/credits anfragen
//Die Ergebnisse in diüöe entsprechenden Tabellen eifügen
//MovieActor/MovieGenre und wenn Actor oder Genre noch nicht in den Tabellen vorhanden sind diese ergänzen

//Den Endpoint, der hier defieniert ist
//jeden Tag anfordern und alle Änderungen daraus erneut anfragen


Deno.serve(initDB);