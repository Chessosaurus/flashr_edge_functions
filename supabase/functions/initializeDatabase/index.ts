async function initDB() {
  console.log("Hello from Functions!")
  //Ablauf: Die gz Datei von tmdb runterladen
  const date = "04_16_2024";
  
  fetch("http://files.tmdb.org/p/exports/movie_ids_" + date + ".json.gz", {
    headers:{ Authorization: 'Bearer {' + token + '}' }
  }).then(response => console.log(response.status))
    .catch(error => console.error(error))
}
initDB();
//gz in json extrahieren

//Für alle Einträge in der Datei schauen, on in Lokaler DB vorhanden
//Wenn nicht die Details/credits anfragen
//Die Ergebnisse in diüöe entsprechenden Tabellen eifügen
//MovieActor/MovieGenre und wenn Actor oder Genre noch nicht in den Tabellen vorhanden sind diese ergänzen

//Den Endpoint, der hier defieniert ist
//jeden Tag anfordern und alle Änderungen daraus erneut anfragen


/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/initializeDatabase' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
