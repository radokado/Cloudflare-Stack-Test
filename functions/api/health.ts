export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  GEMINI_API_KEY?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const timestamp = new Date().toISOString();

  let d1Status = { status: 'unknown', details: '' };
  let r2Status = { status: 'unknown', details: '' };
  let geminiStatus = { status: 'unknown', details: '' };

  // 1. Check Cloudflare D1
  try {
    if (env.DB) {
      const result = await env.DB.prepare('SELECT COUNT(*) as count FROM notes').first<{ count: number }>();
      d1Status = {
        status: 'ok',
        details: `Pripojené. Počet poznámok v DB: ${result?.count ?? 0}`
      };
    } else {
      d1Status = { status: 'missing', details: 'Binding DB nie je nakonfigurovaný v wrangler.jsonc' };
    }
  } catch (err: any) {
    d1Status = { status: 'error', details: err.message || String(err) };
  }

  // 2. Check Cloudflare R2
  try {
    if (env.BUCKET) {
      const list = await env.BUCKET.list({ limit: 1 });
      r2Status = {
        status: 'ok',
        details: `Pripojené. Počet objektov v buchkete: ${list.objects.length}`
      };
    } else {
      r2Status = { status: 'missing', details: 'Binding BUCKET nie je nakonfigurovaný v wrangler.jsonc' };
    }
  } catch (err: any) {
    r2Status = { status: 'error', details: err.message || String(err) };
  }

  // 3. Check Gemini API key
  const apiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
  if (apiKey && apiKey.length > 5) {
    geminiStatus = {
      status: 'ok',
      details: 'GEMINI_API_KEY je nastavený a k dispozícii.'
    };
  } else {
    geminiStatus = {
      status: 'missing',
      details: 'GEMINI_API_KEY chýba v prostredí Cloudflare Secrets'
    };
  }

  const allOk = d1Status.status === 'ok' && r2Status.status === 'ok' && geminiStatus.status === 'ok';

  return new Response(
    JSON.stringify(
      {
        success: true,
        system: {
          name: 'Cloudflare Pages Functions',
          status: 'ok',
          timestamp
        },
        services: {
          d1: d1Status,
          r2: r2Status,
          gemini: geminiStatus
        },
        overall: allOk ? 'healthy' : 'degraded'
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
};
