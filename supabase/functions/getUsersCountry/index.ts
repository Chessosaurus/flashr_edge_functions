import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";


async function getUsersCountry(): Promise<Response>  {

  const client = new Client({
    user: 'postgres.alhcmnttuuzaspxtifhb',
    password: 'cCywQyLPXEk1vPzt',
    database: 'postgres',
    hostname: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 5432,
    tls: {
      enforce: true,
    },
  });
  
  await client.connect();
  
  const sqlQuery = `
  select
  cf.country,
  count(*) as count
from edge_logs
  left join unnest(metadata) as m on true
  left join unnest(m.request) as r on true
  left join unnest(r.cf) as cf on true
group by
  cf.country
order by
  count desc
  `;
  
  try {
    const result = await client.queryObject(sqlQuery);
    console.log('Query results:', result.rows);
    return new Response(JSON.stringify(result), {
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error) {
    console.error('Error executing query:', error);
    return new Response(JSON.stringify(error), {
      headers: {
        "content-type": "application/json",
      },
    });
  } finally {
    await client.end();
  }
}






Deno.serve(getUsersCountry)