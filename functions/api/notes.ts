export interface Env {
  DB: D1Database;
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
      'SELECT id, title, content, category, created_at FROM notes ORDER BY created_at DESC LIMIT 50'
    ).all();

    return new Response(JSON.stringify({ success: true, notes: results }), {
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
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'DB binding nie je k dispozícii' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = (await request.json()) as { title?: string; content?: string; category?: string };

    if (!body.title || !body.content) {
      return new Response(JSON.stringify({ error: 'Názov (title) a obsah (content) sú povinné' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const id = 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const category = body.category || 'general';

    await env.DB.prepare(
      'INSERT INTO notes (id, title, content, category, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
    )
      .bind(id, body.title, body.content, category)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        note: {
          id,
          title: body.title,
          content: body.content,
          category,
          created_at: new Date().toISOString()
        }
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
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
