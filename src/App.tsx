import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Cloud,
  Database,
  HardDrive,
  Sparkles,
  Upload,
  Plus,
  FileText,
  Image as ImageIcon,
  Send,
  Terminal,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock
} from 'lucide-react';

interface ServiceStatus {
  status: 'ok' | 'missing' | 'error' | 'loading' | 'unknown';
  details: string;
}

interface HealthData {
  overall: 'healthy' | 'degraded' | 'error';
  system: {
    name: string;
    status: string;
    timestamp: string;
  };
  services: {
    d1: ServiceStatus;
    r2: ServiceStatus;
    gemini: ServiceStatus;
  };
}

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

interface UploadedImage {
  id: string;
  filename: string;
  r2_key: string;
  mime_type: string;
  size: number;
  created_at: string;
  dataUrl?: string;
}

interface ChatRecord {
  id: string;
  prompt: string;
  response: string;
  model: string;
  created_at: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'd1' | 'r2' | 'gemini'>('dashboard');

  // Health check state
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);

  // D1 Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('general');
  const [addingNote, setAddingNote] = useState(false);

  // R2 Upload state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Gemini Chat state
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatRecord[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Status message bar
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Fetch Health status
  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = (await res.json()) as HealthData;
      if (data.services) {
        setHealthData(data);
      }
    } catch (err: any) {
      console.error('Health fetch error:', err);
      setHealthData({
        overall: 'error',
        system: { name: 'Cloudflare Pages', status: 'offline', timestamp: new Date().toISOString() },
        services: {
          d1: { status: 'error', details: 'Spojenie zlyhalo' },
          r2: { status: 'error', details: 'Spojenie zlyhalo' },
          gemini: { status: 'error', details: 'Spojenie zlyhalo' }
        }
      });
    } finally {
      setHealthLoading(false);
    }
  };

  // Fetch D1 Notes
  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = (await res.json()) as { success?: boolean; notes?: Note[] };
      if (data.notes) {
        setNotes(data.notes);
      }
    } catch (err) {
      console.error('Notes fetch error:', err);
    }
  };

  // Create Note in D1
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;

    setAddingNote(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          category: noteCategory
        })
      });
      const data = (await res.json()) as { success?: boolean; note?: Note; error?: string };
      if (data.success && data.note) {
        setNotes((prev) => [data.note!, ...prev]);
        setNoteTitle('');
        setNoteContent('');
        showStatus('success', 'Poznámka úspešne uložená do Cloudflare D1!');
        fetchHealth();
      } else {
        showStatus('error', data.error || 'Nepodarilo sa uložiť poznámku');
      }
    } catch (err: any) {
      showStatus('error', err.message || 'Chyba pri ukladaní poznámky');
    } finally {
      setAddingNote(false);
    }
  };

  // Fetch R2 Uploaded Images
  const fetchImages = async () => {
    try {
      const res = await fetch('/api/upload');
      const data = (await res.json()) as { success?: boolean; images?: UploadedImage[] };
      if (data.images) {
        setImages(data.images);
      }
    } catch (err) {
      console.error('Images fetch error:', err);
    }
  };

  // Upload file to R2
  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': selectedFile.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(selectedFile.name)
        },
        body: arrayBuffer
      });
      const data = (await res.json()) as { success?: boolean; image?: UploadedImage; error?: string };
      if (data.success && data.image) {
        setImages((prev) => [data.image!, ...prev]);
        setSelectedFile(null);
        showStatus('success', 'Súbor bol úspešne nahraný do Cloudflare R2!');
        fetchHealth();
      } else {
        showStatus('error', data.error || 'Chyba pri nahrávaní do R2');
      }
    } catch (err: any) {
      showStatus('error', err.message || 'Chyba pri nahrávaní súboru');
    } finally {
      setUploading(false);
    }
  };

  // Fetch Gemini Chat History
  const fetchChatHistory = async () => {
    try {
      const res = await fetch('/api/chat');
      const data = (await res.json()) as { success?: boolean; history?: ChatRecord[] };
      if (data.history) {
        setChatHistory(data.history);
      }
    } catch (err) {
      console.error('Chat history fetch error:', err);
    }
  };

  // Send Prompt to Gemini AI
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim()) return;

    const currentPrompt = chatPrompt;
    setChatPrompt('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt })
      });
      const data = (await res.json()) as { success?: boolean; chat?: ChatRecord; error?: string };
      if (data.success && data.chat) {
        setChatHistory((prev) => [data.chat!, ...prev]);
        showStatus('success', 'Odpoveď od Gemini AI bola zaznamenaná do D1!');
      } else {
        showStatus('error', data.error || 'Chyba pri komunikácii s Gemini API');
      }
    } catch (err: any) {
      showStatus('error', err.message || 'Chyba pri generovaní odpovede');
    } finally {
      setChatLoading(false);
    }
  };

  const showStatus = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg(null);
    }, 4500);
  };

  useEffect(() => {
    fetchHealth();
    fetchNotes();
    fetchImages();
    fetchChatHistory();
  }, []);

  const renderStatusBadge = (status: string) => {
    if (status === 'ok') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Aktívne ✓
        </span>
      );
    }
    if (status === 'missing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-800/50">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Chýba Binding
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/80 text-rose-400 border border-rose-800/50">
        <XCircle className="w-3.5 h-3.5 text-rose-400" /> Chyba ✗
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">Cloudflare Stack Test</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  PWA
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Pages Functions • D1 (SQL) • R2 (Storage) • Gemini AI
              </p>
            </div>
          </div>

          <button
            id="refresh-health-btn"
            onClick={fetchHealth}
            disabled={healthLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${healthLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Overiť stav</span>
          </button>
        </div>
      </header>

      {/* Global Status Alert Notice */}
      {statusMsg && (
        <div className="max-w-6xl mx-auto px-4 mt-4 w-full">
          <div
            className={`p-3 rounded-lg border text-sm flex items-center gap-2 transition ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
                : statusMsg.type === 'error'
                ? 'bg-rose-950/90 border-rose-800 text-rose-200'
                : 'bg-blue-950/90 border-blue-800 text-blue-200'
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-slate-900/50 border-b border-slate-800/80 px-4 py-2 mt-2">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'dashboard'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Dashboard & Health</span>
          </button>

          <button
            id="tab-d1"
            onClick={() => setActiveTab('d1')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'd1'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>1. Cloudflare D1 ({notes.length})</span>
          </button>

          <button
            id="tab-r2"
            onClick={() => setActiveTab('r2')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'r2'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>2. Cloudflare R2 ({images.length})</span>
          </button>

          <button
            id="tab-gemini"
            onClick={() => setActiveTab('gemini')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'gemini'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>3. Gemini AI Chat ({chatHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Health Check Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* D1 Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-100 text-sm">Cloudflare D1</h3>
                        <p className="text-[11px] text-slate-400">SQL Databáza (SQLite)</p>
                      </div>
                    </div>
                    {renderStatusBadge(healthData?.services.d1.status || 'loading')}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4 font-mono">
                    {healthData?.services.d1.details || 'Načítavam stav D1...'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('d1')}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-orange-400" /> Testovať D1 Poznámky
                </button>
              </div>

              {/* R2 Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-100 text-sm">Cloudflare R2</h3>
                        <p className="text-[11px] text-slate-400">Object Storage (S3 API)</p>
                      </div>
                    </div>
                    {renderStatusBadge(healthData?.services.r2.status || 'loading')}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4 font-mono">
                    {healthData?.services.r2.details || 'Načítavam stav R2...'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('r2')}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5 text-orange-400" /> Testovať R2 Upload
                </button>
              </div>

              {/* Gemini AI Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-100 text-sm">Google Gemini AI</h3>
                        <p className="text-[11px] text-slate-400">gemini-3.6-flash API</p>
                      </div>
                    </div>
                    {renderStatusBadge(healthData?.services.gemini.status || 'loading')}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4 font-mono">
                    {healthData?.services.gemini.details || 'Načítavam stav Gemini API...'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('gemini')}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5 text-orange-400" /> Testovať Gemini Chat
                </button>
              </div>
            </div>

            {/* Direct Test Highlights Overview */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-orange-400" />
                <h2 className="text-base font-bold text-white">Stručný prehľad Cloudflare architektúry</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-semibold text-orange-400 mb-1">Backend Pages Functions</div>
                  <div className="text-slate-400">Serverless API v adresári `/functions/api/*` bežiace priamo na sieti Cloudflare.</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-semibold text-blue-400 mb-1">D1 Binding (env.DB)</div>
                  <div className="text-slate-400">SQL databáza so schémou tabuliek `users`, `notes`, `images`, `ai_history`.</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-semibold text-amber-400 mb-1">R2 Binding (env.BUCKET)</div>
                  <div className="text-slate-400">Bezplatný prenositeľný Object Storage bez poplatkov za výstup dát (Egress-free).</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="font-semibold text-purple-400 mb-1">Gemini AI Secrets</div>
                  <div className="text-slate-400">Bezpečne uložený `GEMINI_API_KEY` v Cloudflare Secrets prístupný v Pages Functions.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: CLOUDFLARE D1 (NOTES) */}
        {activeTab === 'd1' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-blue-400" />
                  <h2 className="text-base font-bold text-white">Cloudflare D1 Test - Správa Poznámok</h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">Tabuľka: notes</span>
              </div>

              {/* Form to insert into D1 */}
              <form onSubmit={handleAddNote} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Názov poznámky (Title)
                    </label>
                    <input
                      id="note-title-input"
                      type="text"
                      placeholder="napr. Test spojenia s D1"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Kategória (Category)
                    </label>
                    <select
                      id="note-category-select"
                      value={noteCategory}
                      onChange={(e) => setNoteCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                    >
                      <option value="general">General</option>
                      <option value="system">System</option>
                      <option value="test">Test</option>
                      <option value="important">Important</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Obsah poznámky (Content)
                  </label>
                  <textarea
                    id="note-content-input"
                    rows={2}
                    placeholder="Napíšte text poznámky, ktorý sa zapíše do SQL tabuľky D1..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    id="add-note-btn"
                    type="submit"
                    disabled={addingNote}
                    className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs flex items-center gap-2 transition disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {addingNote ? 'Ukladám do D1...' : 'Uložiť do D1 Databázy'}
                  </button>
                </div>
              </form>
            </div>

            {/* D1 Notes List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Záznamy načítané z Cloudflare D1 ({notes.length})
              </h3>

              {notes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                  Žiadne poznámky v D1. Pridajte novú poznámku vyššie.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-slate-100 text-xs">{note.title}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800/50">
                          {note.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{note.content}</p>
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>ID: {note.id}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(note.created_at).toLocaleString('sk-SK')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CLOUDFLARE R2 (UPLOAD) */}
        {activeTab === 'r2' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white">Cloudflare R2 Test - Object Storage Upload</h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">Bucket: R2</span>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleUploadImage} className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="border-2 border-dashed border-slate-800 hover:border-orange-500/50 rounded-xl p-6 text-center transition">
                  <input
                    id="r2-file-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="r2-file-input" className="cursor-pointer space-y-2 block">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        {selectedFile ? selectedFile.name : 'Kliknite pre výber obrázka / súboru'}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {selectedFile
                          ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                          : 'Obrázok sa uloží do Cloudflare R2 a metadáta do D1'}
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    id="upload-r2-btn"
                    type="submit"
                    disabled={!selectedFile || uploading}
                    className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs flex items-center gap-2 transition disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Nahrávam do R2...' : 'Nahrať do Cloudflare R2'}
                  </button>
                </div>
              </form>
            </div>

            {/* Uploaded Images List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                Nahraté objekty v Cloudflare R2 ({images.length})
              </h3>

              {images.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                  Žiadne nahraté súbory v R2. Nahrajte prvý súbor vyššie.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                    >
                      {img.dataUrl && (
                        <div className="w-full h-32 rounded-lg bg-slate-950 overflow-hidden border border-slate-800">
                          <img src={img.dataUrl} alt={img.filename} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-xs text-slate-200 truncate">{img.filename}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{img.r2_key}</div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800 font-mono">
                        <span>{(img.size / 1024).toFixed(1)} KB</span>
                        <span>{new Date(img.created_at).toLocaleTimeString('sk-SK')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: GEMINI AI CHAT */}
        {activeTab === 'gemini' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h2 className="text-base font-bold text-white">Google Gemini AI + D1 Záznam</h2>
                </div>
                <span className="text-xs text-purple-300 font-mono bg-purple-950/80 px-2.5 py-1 rounded-full border border-purple-800/50">
                  gemini-3.6-flash
                </span>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Vaša otázka pre Gemini AI
                  </label>
                  <textarea
                    id="chat-prompt-input"
                    rows={3}
                    placeholder="Napíšte otázku pre Gemini AI (napr. V čom je výhodný Cloudflare D1 oproti klasickému SQL?)..."
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    id="send-chat-btn"
                    type="submit"
                    disabled={chatLoading || !chatPrompt.trim()}
                    className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs flex items-center gap-2 transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {chatLoading ? 'Generujem odpoveď...' : 'Odoslať do Gemini'}
                  </button>
                </div>
              </form>
            </div>

            {/* Chat History List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                História AI Chatu v D1 ({chatHistory.length})
              </h3>

              {chatHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                  Žiadna história chatu v D1. Položte prvá otázku.
                </div>
              ) : (
                <div className="space-y-3">
                  {chatHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0 font-bold text-xs">
                          Q
                        </div>
                        <div className="text-xs font-semibold text-slate-100 mt-1">{item.prompt}</div>
                      </div>

                      <div className="flex items-start gap-3 pt-2 border-t border-slate-800/80">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 font-bold text-xs">
                          AI
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/80 p-3 rounded-xl border border-slate-800/60 w-full">
                          {item.response}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                        <span>Model: {item.model}</span>
                        <span>{new Date(item.created_at).toLocaleString('sk-SK')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-slate-800/80 px-4 py-4 text-center text-xs text-slate-500 font-mono">
        Cloudflare Stack Test • Cloudflare Pages Functions + D1 + R2 + Gemini AI
      </footer>
    </div>
  );
}
