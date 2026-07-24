import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // In-memory simulation data stores for D1 and R2 when running local dev server
  const mockNotes: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    created_at: string;
  }> = [
    {
      id: 'note_init_1',
      title: 'Cloudflare D1 Je Aktívne! 🚀',
      content: 'Tento záznam pochádza z databázy Cloudflare D1 (SQLite na okraji siete).',
      category: 'system',
      created_at: new Date().toISOString()
    }
  ];

  const mockImages: Array<{
    id: string;
    filename: string;
    r2_key: string;
    mime_type: string;
    size: number;
    created_at: string;
    dataUrl?: string;
  }> = [];

  const mockAiHistory: Array<{
    id: string;
    prompt: string;
    response: string;
    model: string;
    created_at: string;
  }> = [
    {
      id: 'chat_init_1',
      prompt: 'Ahoj Gemini! Ako funguje Cloudflare Stack?',
      response: 'Cloudflare Stack kombinuje Pages Functions pre backend serverless logiku, D1 pre relakčnú SQL databázu, R2 pre objektové úložisko a Gemini AI pre inteligentné odpovede.',
      model: 'gemini-3.6-flash',
      created_at: new Date().toISOString()
    }
  ];

  // -------------------------------------------------------------
  // API ENDPOINTS (emulating Cloudflare Pages Functions locally)
  // -------------------------------------------------------------

  // 1. HEALTH CHECK (/api/health)
  app.get('/api/health', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const hasApiKey = Boolean(apiKey && apiKey.length > 5);

    res.json({
      success: true,
      system: {
        name: 'Cloudflare Pages & Local Dev Server',
        status: 'ok',
        timestamp: new Date().toISOString()
      },
      services: {
        d1: {
          status: 'ok',
          details: `Pripojené (Local D1 Simulation). Počet poznámok: ${mockNotes.length}`
        },
        r2: {
          status: 'ok',
          details: `Pripojené (Local R2 Object Storage). Uložené súbory: ${mockImages.length}`
        },
        gemini: {
          status: hasApiKey ? 'ok' : 'missing',
          details: hasApiKey
            ? 'GEMINI_API_KEY je nakonfigurovaný v prostredí.'
            : 'GEMINI_API_KEY chýba. Nastavte ho v paneli Secrets.'
        }
      },
      overall: hasApiKey ? 'healthy' : 'degraded'
    });
  });

  // 2. NOTES API (/api/notes - Cloudflare D1 simulation)
  app.get('/api/notes', (req, res) => {
    res.json({ success: true, notes: mockNotes });
  });

  app.post('/api/notes', (req, res) => {
    const { title, content, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Názov (title) a obsah (content) sú povinné' });
    }

    const note = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title,
      content,
      category: category || 'general',
      created_at: new Date().toISOString()
    };

    mockNotes.unshift(note);
    res.status(201).json({ success: true, note });
  });

  // 3. R2 UPLOAD API (/api/upload - Cloudflare R2 simulation)
  app.get('/api/upload', (req, res) => {
    res.json({ success: true, images: mockImages });
  });

  app.post('/api/upload', express.raw({ type: '*/*', limit: '10mb' }), (req, res) => {
    try {
      const fileNameHeader = (req.headers['x-file-name'] as string) || 'image_' + Date.now() + '.png';
      const mimeTypeHeader = (req.headers['content-type'] as string) || 'image/png';
      
      let buffer: Buffer;
      if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else if (typeof req.body === 'string') {
        buffer = Buffer.from(req.body);
      } else {
        buffer = Buffer.from([]);
      }

      const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const sanitizedFileName = fileNameHeader.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const r2Key = `uploads/${id}_${sanitizedFileName}`;

      const imageRecord = {
        id,
        filename: sanitizedFileName,
        r2_key: r2Key,
        mime_type: mimeTypeHeader.includes('multipart') ? 'image/png' : mimeTypeHeader,
        size: buffer.length || 1024,
        created_at: new Date().toISOString(),
        dataUrl: buffer.length > 0 ? `data:${mimeTypeHeader};base64,${buffer.toString('base64')}` : undefined
      };

      mockImages.unshift(imageRecord);

      res.status(201).json({
        success: true,
        image: imageRecord
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. GEMINI CHAT API (/api/chat - Gemini AI + D1 ai_history simulation)
  app.get('/api/chat', (req, res) => {
    res.json({ success: true, history: mockAiHistory });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Správa (prompt) nemôže byť prázdna' });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      let aiText = '';
      if (apiKey && apiKey.length > 5) {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'Si asistent v aplikácii Cloudflare Stack Test. Odpovedaj stručne, vecne a profesionálne v slovenskom jazyku.'
          }
        });

        aiText = response.text || 'Bez odpovede od AI.';
      } else {
        aiText = `[Simulovaná Odpoveď Gemini AI - GEMINI_API_KEY nie je v Secrets]: Ďakujem za Vašu správu "${prompt}". Po pridaní platného kľúča GEMINI_API_KEY dostanete živé odpovede od Google Gemini API.`;
      }

      const chatRecord = {
        id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        prompt: prompt.trim(),
        response: aiText,
        model: 'gemini-3.6-flash',
        created_at: new Date().toISOString()
      };

      mockAiHistory.unshift(chatRecord);

      res.json({
        success: true,
        chat: chatRecord
      });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Cloudflare Stack Test beží na portu ${PORT}`);
  });
}

startServer();
