# Boulder Urbà – Festa de la Muntanya de Collbató

App web per gestionar la competició de boulder urbà.

## Instal·lació

```bash
npm install
```

## Configuració

1. Copia `.env.example` i anomena'l `.env.local`
2. Omple les claus de Supabase (Settings → API al teu projecte)
3. Posa una contrasenya per al panell admin

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ADMIN_PASSWORD=la-teva-contrasenya
```

## Executar en local

```bash
npm run dev
```

Obre http://localhost:5173

## Construir per producció

```bash
npm run build
```

## Rutes

- `/` → Login participant
- `/dashboard` → Pantalla del participant
- `/problemes` → Llista de blocs
- `/classificacio` → Rànquing públic
- `/admin` → Panell d'administració

## Incrustació a WordPress (iframe)

```html
<iframe
  src="https://la-teva-url.vercel.app"
  width="100%"
  height="800"
  frameborder="0"
  style="border-radius: 12px;"
></iframe>
```
