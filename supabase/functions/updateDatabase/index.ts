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



async function updateDatabse(req: Request): Promise<Response> {
  
}

Deno.serve(updateDatabse);
