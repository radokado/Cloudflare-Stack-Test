# Cloudflare Stack Test 🚀

Aplikácia **Cloudflare Stack Test** je minimalistická PWA (Progressive Web App) navrhnutá pre komplexný test celého ekosystému **Cloudflare Pages** a **Google Gemini AI**.

---

## 🛠️ Použité technológie

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **PWA**: Web App Manifest (`manifest.json`) + Service Worker (`sw.js`)
- **Backend**: Cloudflare Pages Functions (`/functions/api/*`)
- **SQL Databáza**: Cloudflare D1 (SQLite na okraji siete)
- **Objektové úložisko**: Cloudflare R2 (S3 kompatibilné úložisko)
- **Umelá inteligencia**: Google Gemini AI (`gemini-3.6-flash`) priamo cez serverless backend

---

## 📂 Štruktúra projektu

```text
├── package.json          # Zoznam závislostí a zostavovacie skripty
├── vite.config.ts        # Konfigurácia pre Vite
├── tsconfig.json         # Konfigurácia TypeScriptu (vrátane @cloudflare/workers-types)
├── wrangler.jsonc        # Wrangler konfiguračný súbor pre Cloudflare Pages & Bindings
├── schema.sql            # SQL D1 schémy pre tabuľky: users, notes, images, ai_history
├── public/
│   ├── manifest.json     # PWA manifest
│   └── sw.js             # Service Worker pre offline podporu
├── src/
│   ├── App.tsx           # UI Dashboard, Health Check, D1, R2 a Gemini Chat
│   ├── main.tsx          # Vstupný bod aplikácie a registrácia Service Workera
│   └── index.css         # Tailwind CSS štýly
├── functions/api/
│   ├── health.ts         # GET /api/health - Test spojenia s D1, R2 a Gemini API
│   ├── notes.ts          # GET/POST /api/notes - Zápis a načítanie poznámok z D1
│   ├── upload.ts         # GET/POST /api/upload - Nahrávanie súborov do R2 + zápis metadát do D1
│   └── chat.ts           # GET/POST /api/chat - Komunikácia s Gemini AI + uloženie do D1
└── README.md             # Návod na sprevádzkovanie v slovenčine
```

---

## 🚀 Lokálne spustenie v vývojovom prostredí

1. **Inštalácia závislostí:**
   ```bash
   npm install
   ```

2. **Spustenie lokálneho vývojového servera:**
   ```bash
   npm run dev
   ```
   Aplikácia beží na `http://localhost:3000` s emulovanými D1, R2 a Gemini API službami.

---

## ☁️ Sprevádzkovanie a nasadenie na Cloudflare Pages

### 1. Vytvorenie D1 Databázy
Vložte príkaz do terminálu Wrangler CLI:
```bash
npx wrangler d1 create cf-stack-test-db
```
Po vytvorení skopírujte vygenerované `database_id` do súboru `wrangler.jsonc`:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "cf-stack-test-db",
    "database_id": "TU_VLOŽTE_VAŠE_DATABASE_ID"
  }
]
```

A aplikujte SQL tabuľky zo súboru `schema.sql`:
```bash
npx wrangler d1 execute cf-stack-test-db --remote --file=./schema.sql
```

### 2. Vytvorenie R2 Bucketu
Vytvorte nový R2 bucket:
```bash
npx wrangler r2 bucket create cf-stack-test-r2
```

### 3. Nastavenie Gemini API Kľúča v Cloudflare Secrets
Pridajte váš Google Gemini API kľúč medzi tajné premenné Cloudflare Pages:
```bash
npx wrangler pages secret put GEMINI_API_KEY
```

### 4. Zostavenie a nasadenie (Deploy)
```bash
npm run build
npx wrangler pages deploy dist
```

Po nasadení získate verejnú URL adresu vašej Cloudflare Pages aplikácie, kde môžete ihneď otestovať zelený stav všetkých služieb! ⚡
