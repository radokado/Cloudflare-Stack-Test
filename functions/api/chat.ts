import { GoogleGenAI } from '@google/genai';

export interface Env {
  DB: D1Database;
  GEMINI_API_KEY?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'DB binding nie je k dispozícii' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { results } = await env.DB.prepare(
      'SELECT id, prompt, response, model, created_at FROM ai_history ORDER BY created_at DESC LIMIT 30'
    ).all();

    return new Response(JSON.stringify({ success: true, history: results }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = (await request.json()) as { prompt?: string };
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Správa (prompt) nemôže byť prázdna' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'GEMINI_API_KEY nie je nastavený. Nastavte kľúč v Cloudflare Secrets.'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize GoogleGenAI SDK
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const modelName = 'gemini-3.6-flash';

    const aiResult = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction:
          'Si asistent v aplikácii Cloudflare Stack Test. Odpovedaj stručne, vecne a profesionálne v slovenskom jazyku.'
      }
    });

    const aiText = aiResult.text || 'Bez odpovede od AI.';
    const id = 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Save prompt and response into Cloudflare D1 (ai_history table)
    if (env.DB) {
      try {
        await env.DB.prepare(
          'INSERT INTO ai_history (id, prompt, response, model, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
        )
          .bind(id, prompt, aiText, modelName)
          .run();
      } catch (dbErr) {
        console.error('Chyba zápisu do D1 ai_history:', dbErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        chat: {
          id,
          prompt,
          response: aiText,
          model: modelName,
          created_at: new Date().toISOString()
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};
