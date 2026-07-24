export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
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
      'SELECT id, filename, r2_key, mime_type, size, created_at FROM images ORDER BY created_at DESC LIMIT 50'
    ).all();

    return new Response(JSON.stringify({ success: true, images: results }), {
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
    if (!env.BUCKET) {
      return new Response(JSON.stringify({ error: 'R2 BUCKET binding nie je k dispozícii' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentType = request.headers.get('content-type') || '';
    let fileName = 'image_' + Date.now() + '.png';
    let fileBuffer: ArrayBuffer | null = null;
    let mimeType = 'image/png';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return new Response(JSON.stringify({ error: 'Súbor sa nenašiel vo formData ("file")' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      fileName = file.name || fileName;
      mimeType = file.type || mimeType;
      fileBuffer = await file.arrayBuffer();
    } else {
      fileBuffer = await request.arrayBuffer();
      const nameHeader = request.headers.get('x-file-name');
      if (nameHeader) fileName = nameHeader;
      if (contentType) mimeType = contentType;
    }

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      return new Response(JSON.stringify({ error: 'Súbor je prázdny alebo neplatný' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const r2Key = `uploads/${id}_${sanitizedFileName}`;

    // 1. Upload to Cloudflare R2
    await env.BUCKET.put(r2Key, fileBuffer, {
      httpMetadata: { contentType: mimeType }
    });

    // 2. Save metadata into Cloudflare D1
    if (env.DB) {
      await env.DB.prepare(
        'INSERT INTO images (id, filename, r2_key, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      )
        .bind(id, sanitizedFileName, r2Key, mimeType, fileBuffer.byteLength)
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        image: {
          id,
          filename: sanitizedFileName,
          r2_key: r2Key,
          mime_type: mimeType,
          size: fileBuffer.byteLength,
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
      'Access-Control-Allow-Headers': 'Content-Type, X-File-Name'
    }
  });
};
