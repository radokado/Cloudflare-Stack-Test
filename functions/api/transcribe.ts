import { GoogleGenAI } from '@google/genai';

export interface Env {
  GEMINI_API_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const apiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY chýba.' }), { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('audio') as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: 'Žiadny audio súbor.' }), { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Initialize GoogleGenAI SDK
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    // Transcribe using Gemini multimodal capabilities
    const result = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          inlineData: {
            data: Buffer.from(uint8Array).toString('base64'),
            mimeType: file.type || 'audio/webm'
          }
        },
        { text: 'Prepíš tento zvukový záznam do textu v slovenčine. Vráť iba prepísaný text.' }
      ]
    });

    return new Response(JSON.stringify({ success: true, text: result.text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
