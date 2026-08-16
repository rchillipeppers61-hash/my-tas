// supabase/functions/groq-proxy/index.ts
//
// Proxy aman buat Groq API. API key Groq disimpen di server (Supabase
// Secrets), TIDAK PERNAH dikirim ke browser. Browser cuma manggil endpoint
// ini, endpoint ini yang manggil Groq di belakang layar.

import { corsHeaders } from "../_shared/cors.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

Deno.serve(async (req) => {
  // Browser bakal ngirim OPTIONS request dulu sebelum request asli (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY belum diset di server." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // "transcribe" atau "generate"

    if (action === "transcribe") {
      // Terima audio dari browser, teruskan ke Groq Whisper
      const incomingForm = await req.formData();
      const audioFile = incomingForm.get("file");

      const forwardForm = new FormData();
      forwardForm.append("file", audioFile);
      forwardForm.append("model", "whisper-large-v3-turbo");
      forwardForm.append("language", "id");
      forwardForm.append("response_format", "text");

      const groqRes = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: forwardForm,
      });

      const text = await groqRes.text();
      return new Response(text, {
        status: groqRes.status,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    if (action === "generate") {
      // Terima transcript dari browser, teruskan ke Groq LLM
      const body = await req.json();

      const groqRes = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await groqRes.json();
      return new Response(JSON.stringify(data), {
        status: groqRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action tidak dikenali" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
