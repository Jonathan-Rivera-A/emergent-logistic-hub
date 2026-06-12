# Sistema de Transporte — Forjatec

Plataforma full-stack para monitoreo logístico: rutas GPS, reportes operativos,
módulo de **Business Intelligence** sobre telemetría y administración de flota.

**Stack**

| Capa      | Tecnología                                                 |
|-----------|------------------------------------------------------------|
| Frontend  | React 18 + TypeScript + Vite, React Router 6, Recharts, Leaflet + leaflet.heat, lucide-react, axios |
| Backend   | FastAPI, Motor (async MongoDB), Pandas + NumPy, slowapi, python-jose, passlib/bcrypt, httpx |
| Datos     | MongoDB (persistencia) + CSV en memoria (telemetría)       |
| Auth      | JWT propio (HS256) + Supabase Auth como puerta de Google  |
| Seguridad | slowapi rate limiting, Pydantic strict validation, CORS whitelist |

---

## 1. Requisitos

- Node.js ≥ 18 y **yarn** (o npm) — `sudo npm i -g yarn`
- Python ≥ 3.11
- MongoDB ≥ 6.0 corriendo local o remoto
- (opcional) Proyecto Supabase con proveedor Google activado
- Archivo `backend/data/telemetria.csv` con el dataset GPS (22MB aprox)

---

## 2. Instalación rápida

```bash
git clone https://github.com/Jonathan-Rivera-A/emergent-logistic-hub.git
cd emergent-logistic-hub
git checkout fuel-control-reports-and-monitor
./scripts/bootstrap.sh
```

El script instala dependencias, copia los `.env.example` a `.env` y te recuerda
los siguientes pasos.

### Instalación manual

```bash
# Backend
cd backend
python -m pip install -r requirements.txt
cp .env.example .env           # ajusta JWT_SECRET, SUPABASE_*

# Frontend
cd ../frontend
yarn install                   # o: npm install
cp .env.example .env           # ajusta VITE_SUPABASE_*
```

---

## 3. Variables de entorno

### `backend/.env`

| Variable        | Descripción                                              |
|-----------------|----------------------------------------------------------|
| `MONGO_URL`     | Cadena de conexión Mongo (obligatorio)                   |
| `DB_NAME`       | Nombre de la base                                        |
| `CORS_ORIGINS`  | Lista separada por comas (no usar `*` en producción)     |
| `JWT_SECRET`    | Secreto HS256. Genera con `openssl rand -hex 32`         |
| `JWT_TTL_MINUTES` | Vigencia del token (default 720 = 12h)                 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Usuario semilla (se crea solo si no existe en la colección `users`) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Necesarios para verificar el token de Google OAuth. Sin ellos el endpoint `/api/auth/google-exchange` responde 503 pero el login local sigue funcionando |

### `frontend/.env`

| Variable               | Descripción                                           |
|------------------------|-------------------------------------------------------|
| `REACT_APP_BACKEND_URL` / `VITE_BACKEND_URL` | URL del backend (ej. `http://localhost:8001`) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Cliente Supabase (usado por el botón Google) |
| `VITE_GOOGLE_MAPS_API_KEY` | Key para la pestaña "Monitor de rutas"           |

---

## 4. Comandos de ejecución

```bash
# Terminal 1 — backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 — frontend
cd frontend
yarn dev                  # o: yarn start / npm run dev
```

Abre http://localhost:3000 e inicia sesión con `admin@forjatec.com` / `fojatec11553`
(o con Google si configuraste Supabase).

---

## 5. Estructura del proyecto

```
.
├── backend/
│   ├── auth/                    # paquete de autenticación
│   │   ├── router.py            # /api/auth/{login, google-exchange, me, health}
│   │   ├── jwt_utils.py         # create/decode JWT
│   │   ├── hashing.py           # bcrypt
│   │   ├── schemas.py           # Pydantic (extra=forbid)
│   │   ├── user_store.py        # Mongo collection 'users' + seed_admin
│   │   └── dependencies.py      # get_current_user, require_admin
│   ├── bi/                      # módulo Business Intelligence
│   │   ├── data_loader.py       # lee CSV, aplana, cachea con lru_cache
│   │   ├── analytics.py         # KPIs, series, top-rutas, heatmap, anomalías
│   │   └── router.py            # /api/bi/* (rate-limited 60/min)
│   ├── data/
│   │   └── telemetria.csv       # dataset GPS
│   ├── tests/
│   │   └── test_bi_endpoints.py # 20 tests de la API
│   ├── rate_limit.py            # instancia compartida slowapi Limiter
│   ├── server.py                # entry point FastAPI
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── contexts/AuthContext.tsx       # JWT en localStorage + Supabase OAuth
│       ├── components/
│       │   ├── ProtectedRoute.tsx         # guarda de rutas
│       │   └── bi/                        # componentes BI (Filters, Panels, Maps)
│       ├── hooks/useBiData.ts             # fetch + cancelación
│       ├── pages/
│       │   ├── Login.tsx                  # email/password + Google
│       │   ├── AuthCallback.tsx           # redirect Supabase
│       │   ├── BI.tsx                     # dashboard (protegido)
│       │   ├── MonitorRutas.tsx
│       │   ├── Reportes.tsx
│       │   └── Administrador.tsx          # protegido + require_admin
│       └── lib/biApi.ts
├── scripts/
│   ├── bootstrap.sh             # instalación automatizada
│   └── seed_admin.sh
└── README.md
```

---

## 6. Módulo de Business Intelligence

### Fuentes y pipeline

```
data/telemetria.csv (170k puntos GPS, 718 rutas, 8 dispositivos)
         │
         ▼
bi.data_loader._load()
   • json.loads() sobre Historial_Coordenadas (lista de puntos)
   • pd.to_datetime, filtros lat∈[-90,90], lng∈[-180,180], 0≤velocidad≤250
   • orden por ruta + timestamp
         │
         ▼
lru_cache(maxsize=1)  →  DataFrame en memoria (≈60MB)
         │
         ├─ get_route_summary():   distancia haversine vectorizada, vel_prom/max, duración
         │
         ▼
bi.analytics
   • compute_kpis(): totales + detenciones + anomalías
   • time_series(granularity): day|week|month
   • top_routes(limit): agrupación por celda ~1km
   • histogram(metric, bins): distancia|duración|velocidad
   • heatmap_points(sample): muestreo con intensidad por velocidad
   • anomalies(): z-score combinado sobre distancia/duración + flag vel > 120
   • device_ranking(): km acumulados por dispositivo
         │
         ▼
FastAPI /api/bi/* (JWT required, 60 req/min por IP)
         │
         ▼
React BI page
   • useBiData() — 7 llamadas Promise.all + cancelación
   • Recharts (AreaChart, BarChart, Line)
   • Leaflet + leaflet.heat para mapa de calor
   • Leaflet polylines para rutas frecuentes
   • Filtros: dispositivo, fecha desde/hasta, granularidad
   • Export CSV de anomalías
```

### Endpoints disponibles (todos bajo `/api/bi`, requieren Bearer JWT)

| Método | Ruta                     | Descripción                              |
|--------|--------------------------|------------------------------------------|
| GET    | `/health`                | conteo de puntos y rutas cargados       |
| GET    | `/devices`               | lista de 8 dispositivos + rango fechas  |
| GET    | `/kpis`                  | 9 KPIs agregados (filtros opcionales)   |
| GET    | `/timeseries`            | serie temporal por día/semana/mes       |
| GET    | `/top-routes`            | origen→destino más frecuentes           |
| GET    | `/histogram`             | distribución por métrica                |
| GET    | `/heatmap`               | puntos `[lat, lng, intensity]`          |
| GET    | `/anomalies`             | rutas con score alto (z-score + flag vel)|
| GET    | `/device-ranking`        | agregado por dispositivo                |
| GET    | `/route/{ruta_id}`       | traza completa de una ruta              |

Parámetros de filtrado (opcionales en la mayoría): `dispositivo`, `desde`, `hasta`,
`granularity`, `metric`, `sample`, `limit`. Todos validados por Pydantic con
regex y rangos explícitos.

### Librerías BI

- **Recharts 2.12** — Area, Line, Bar, histogramas, ranking.
- **Leaflet 1.9 + leaflet.heat 0.2** — mapa base OpenStreetMap, heatmap y polylines.
- **Pandas 2.2 + NumPy** — limpieza, haversine vectorizado, agregaciones.

---

## 7. Autenticación

### Método A — Usuario local (email + contraseña)

- Se crea automáticamente al arrancar si no existe, tomando `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME` del `.env`.
- Contraseña almacenada con **bcrypt** (12 rondas).
- Endpoint: `POST /api/auth/login` → devuelve `access_token` JWT + info de usuario.
- **Rate limit: 5 intentos por minuto por IP** (slowapi). Sobre el límite responde 429.

### Método B — Google OAuth (vía Supabase)

1. En tu proyecto Supabase → Authentication → Providers → **Google**: activar
   y pegar `client_id` + `client_secret` de Google Cloud.
2. Añadir `http://localhost:3000/auth/callback` (y tu dominio de producción) a
   los redirect URIs autorizados.
3. En `frontend/.env` setear `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. En `backend/.env` setear `SUPABASE_URL` y `SUPABASE_ANON_KEY` (los mismos
   valores; el backend verifica el token con `/auth/v1/user` de Supabase).

Flujo:

```
Usuario → /login → click "Continuar con Google"
       → supabase.auth.signInWithOAuth (redirige a Google)
       → Google callback → /auth/callback del frontend
       → AuthContext detecta sesión Supabase y llama a POST /api/auth/google-exchange
       → backend verifica con Supabase, upsert en Mongo, emite JWT propio
       → frontend guarda { token, user } en localStorage
```

### Protección de rutas

| Ruta              | Acceso                     |
|-------------------|---------------------------|
| `/login`, `/auth/callback` | Público                  |
| `/` (Monitor de rutas)    | Público *(sin cambios)*  |
| `/reportes`               | Público *(sin cambios)*  |
| `/bi`                     | **Requiere login**       |
| `/administrador`          | **Requiere login + `is_admin=true`** |

Tokens se guardan en `localStorage` bajo `auth:token` y `auth:user`. El
interceptor de axios los añade a cada request. Al recibir 401, la sesión se
limpia automáticamente y el usuario es redirigido a `/login`.

---

## 8. Seguridad

### Rate limiting

- `POST /api/auth/login` → **5/min** por IP
- `POST /api/auth/google-exchange` → **10/min** por IP
- `GET /api/bi/*` → **60/min** por IP (por endpoint, cada uno con su decorador)
- `POST /api/status` → **30/min** por IP

Implementado con [`slowapi`](https://slowapi.readthedocs.io/). Al exceder el
límite se devuelve `429 Too Many Requests` con header `Retry-After`.

### Protección contra inyección

El backend usa **MongoDB** (no SQL), por lo que las vulnerabilidades SQL
injection no aplican; en su lugar aplicamos las contramedidas equivalentes
para NoSQL injection:

1. **Validación Pydantic estricta** en todo payload y query string
   (`extra="forbid"`, `str_strip_whitespace=True`, tipos `EmailStr`,
   `pattern=`, `min_length`/`max_length`, `ge`/`le`). Archivo:
   `backend/auth/schemas.py` y decoradores `Query(...)` en `bi/router.py`.
2. **Whitelist de valores** en `granularity` y `metric` con regex
   (`^(day|week|month)$`, `^(distancia_km|duracion_min|vel_prom|velocidad)$`).
3. **Parametrización de queries**: nunca concatenamos cadenas para Mongo.
   Todas las queries usan operadores del driver Motor con diccionarios
   (`db.users.find_one({"email": email.lower()}, {"_id": 0})`).
4. **Sanitización de entrada** — `str_strip_whitespace=True` + regex de
   dispositivo (`^[\w\s.\-\u00c0-\u017f]+$`) impide inyección de operadores
   Mongo (`$ne`, `$gt`, etc.) a través de query params.
5. **Exclusión de `_id`** en todas las queries públicas (proyección `{"_id": 0}`).

### Otras protecciones

- **Bcrypt 12 rondas** para contraseñas.
- **JWT HS256** con `exp`, `iat`, `sub`.
- **CORS whitelist** via `CORS_ORIGINS` (nunca `*` en producción).
- **Comparación constante** en login (hash se verifica incluso cuando el
  usuario no existe, para evitar timing attacks de enumeración).
- **401 automático** elimina la sesión en frontend.

---

## 9. Errores comunes

| Error                                                        | Causa / solución                                                                 |
|--------------------------------------------------------------|----------------------------------------------------------------------------------|
| `Failed to resolve import "axios"` / `"leaflet"`             | `yarn install` (o `npm install`) en `frontend/` tras hacer pull de la rama.      |
| `Command "yarn" not found`                                   | `sudo npm install -g yarn` o usar `npm` directamente.                            |
| `Request failed with status code 404` en BI                  | `REACT_APP_BACKEND_URL` apunta al host equivocado. Revisa `frontend/.env`.       |
| `Supabase no está configurado en el servidor` (503)          | Faltan `SUPABASE_URL` / `SUPABASE_ANON_KEY` en `backend/.env`.                   |
| `Element with name "gmp-pin" already defined`                | Warning benigno del SDK de Google Maps en hot-reload. Ignorar.                   |
| `supabaseUrl is required` (blank page)                       | Falta `VITE_SUPABASE_URL` en `frontend/.env`. El archivo `lib/supabase.ts` cae a placeholder pero Vite re-importa al tocar el archivo; reinicia `yarn dev`. |
| `429 Too Many Requests` tras varios logins                   | Rate limit alcanzado. Espera 60s o cambia de IP.                                 |
| `points_loaded: 0` en `/api/bi/health`                       | Falta `backend/data/telemetria.csv`. Cópialo y reinicia el backend.              |
| `cryptography` falla al instalar con `pip`                   | `sudo apt install build-essential libssl-dev libffi-dev python3-dev`.            |

---

## 10. Tests

```bash
cd /app
python -m pytest backend/tests/test_bi_endpoints.py -v
```

20 tests cubren todos los endpoints BI (validación de schemas, rate limits
de bordes, filtros por dispositivo y fecha, paths de ruta inexistente, etc.).

---

## 11. Deploy

Este proyecto se despliega en Emergent/Vercel/Railway/VPS sin cambios. Solo
asegúrate de:

- Setear `JWT_SECRET` a un valor aleatorio.
- Reemplazar `CORS_ORIGINS="*"` por tu dominio real.
- Configurar Supabase con el redirect URI de producción.
- Ajustar `REACT_APP_BACKEND_URL` y `VITE_BACKEND_URL` al dominio público del backend.

---

## Licencia

Propiedad de Forjatec. Uso interno.
