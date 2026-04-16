# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Notifications and alerts microservice for an electric vehicle simulator. It receives domain events from other services via Redis Pub/Sub, persists alerts and notifications to PostgreSQL, and pushes real-time updates to admin dashboards via WebSocket.

## Commands

### Run (Docker — the only supported mode)
```bash
docker-compose up -d --build
# Service exposed at http://localhost:3001, WS at ws://localhost:3001/ws
```

### Other scripts
```bash
npm run monitor    # terminal UI that reads from Redis in real time
npm run build      # syntax check only (node --check)
```

### Environment
- `.env.docker` — used by the Docker container (`DB_HOST=postgres`, `REDIS_URL=redis://redis:6379`)

## Architecture

```
[Other microservices]
        │  Redis Pub/Sub (vehiculos.eventos, zonas.eventos, postes.eventos)
        ▼
  src/redis/subscriber.js   ← connects, subscribes to channels
        │
  src/redis/handlers.js     ← maps raw Redis payloads → business events
        │
  src/services/notificationsService.js  ← orchestration (idempotent)
  src/services/rules.js                 ← pure domain rules (no I/O)
        │
  src/repositories/alertasRepository.js
  src/repositories/notificacionesRepository.js  ← DB access via pg pool
        │
        ├─► src/redis/publisher.js   ← re-publishes on "notificaciones.eventos"
        └─► src/ws/hub.js            ← broadcast to admin WebSocket clients

[Admin dashboard]
        │  WebSocket ws://…/ws
        └─ src/ws/wsServer.js        ← attaches WS server to the HTTP server

[REST API]
  src/app.js              ← Express app (routes, CORS, static files)
  src/server.js           ← HTTP server entry point; starts WS + Redis subscriber
  src/routes/             ← route definitions
  src/controllers/        ← thin controllers (call service layer)
```

### Data model (PostgreSQL)

Two tables, both with UUID PKs:

- **`alertas`** — one active alert per `(tipo, id_entidad)` pair (enforced by partial unique index). Severidad only escalates: `INFO → WARNING → CRITICAL`.
- **`notificaciones`** — one PENDIENTE notification per `dedup_key` (`tipo:idEntidad`). State machine: `PENDIENTE → ACK → RESUELTA` (forward-only).

Enums: `tipo_alerta` (`VEHICULO_SIN_BATERIA`, `RESERVA_EXPIRADA`, `POSTE_AVERIADO`), `severidad_alerta` (`INFO`, `WARNING`, `CRITICAL`), `estado_alerta` (`ACTIVA`, `CERRADA`), `estado_notificacion` (`PENDIENTE`, `ACK`, `RESUELTA`).

Schema is auto-applied on first container start via `db/init/01_schema.sql`.

### REST API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/notificaciones` | List all (optional `?estado=PENDIENTE`) |
| POST | `/api/notificaciones/evento` | Manually inject an event |
| POST | `/api/notificaciones/:id/ack` | Acknowledge a notification |
| POST | `/api/notificaciones/:id/resolver` | Resolve a notification |
| GET | `/api/alertas` | List all alerts |
| POST | `/api/alertas/:id/cerrar` | Close an alert |

### Redis channels

| Direction | Channel | Purpose |
|-----------|---------|---------|
| Subscribed | `vehiculos.eventos` | Battery level / state changes |
| Subscribed | `zonas.eventos` | Zone reservation events |
| Subscribed | `postes.eventos` | Charging post availability |
| Published | `notificaciones.eventos` | Own events emitted after processing |

### Key design constraints

- **Idempotency**: calling `procesarEvento` twice with the same input produces the same DB state. The partial unique indexes in PostgreSQL enforce uniqueness at the DB level.
- **Two Redis clients**: `subscriber.js` and `publisher.js` maintain separate client instances (required by the `redis` library — a subscribed client cannot also publish).
- **Shared HTTP/WS port**: `server.js` creates a single `http.Server` and mounts both Express and the `ws` WebSocket server on it. The WS endpoint is `/ws`.

### Admin frontend

A standalone HTML file at `api/paneladministrador.html`. Open it directly in a browser (or via Live Server). It connects to the WebSocket at `ws://localhost:3001/ws` and listens for `NOTIFICACION_CREADA` / `NOTIFICACION_ACTUALIZADA` events.
