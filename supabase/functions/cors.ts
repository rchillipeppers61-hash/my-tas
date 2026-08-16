// supabase/functions/_shared/cors.ts
//
// Header CORS dipakai bareng semua Edge Function, biar browser boleh
// manggil endpoint ini.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
