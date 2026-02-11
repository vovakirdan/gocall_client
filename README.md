# GoCall Client

React + Vite client for WireChat.

## Local Run

```bash
npm ci
npm run dev
```

Defaults:
- API: `http://localhost:8080/api`
- WebSocket: `ws://localhost:8080/ws`

## Configure Backend URLs

Use `VITE_` variables at build/start time:

```bash
VITE_API_BASE_URL="https://chat.example.com/api"
VITE_WS_URL="wss://chat.example.com/ws"
```

## Build Web Client

```bash
npm ci
VITE_API_BASE_URL="https://chat.example.com/api" \
VITE_WS_URL="wss://chat.example.com/ws" \
npm run build
```

Artifacts are generated in `dist/`.

## Quick Static Serve

```bash
npx serve -s dist -l 4173
```

Open `http://localhost:4173`.

## Production Notes

- Serve `dist/` behind Nginx/Caddy.
- Proxy `/api` and `/ws` to `wirechat-server` (`127.0.0.1:8080`).
- For browser calls use HTTPS + WSS for both app and LiveKit.
