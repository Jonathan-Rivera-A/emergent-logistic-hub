# Guía de despliegue — BI + Login (local y producción)

Esta guía te lleva paso a paso desde un repo recién clonado hasta tener la
pestaña **Business Intelligence** y el **login** funcionando en local y en
producción.

---

## 1. Antes de empezar

Necesitas:

| Herramienta            | Versión mínima | Para qué                       |
|------------------------|----------------|--------------------------------|
| Git                    | 2.30           | clonar y cambiar de rama       |
| Node.js                | 18 LTS         | construir y ejecutar el frontend |
| Yarn *(o npm)*         | 1.22 / 9.x     | instalar dependencias JS       |
| Python                 | 3.11           | ejecutar FastAPI               |
| pip                    | 23.x           | instalar dependencias Python   |
| MongoDB                | 6.0            | persistencia (sesiones / usuarios) |

Comprueba con:

```bash
git --version && node -v && python --version && mongod --version
```

Si te falta `yarn`:
```bash
sudo npm install -g yarn
# o usa npm directamente; ambos funcionan
```

Si te falta MongoDB local:
```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y mongodb
sudo systemctl start mongodb

# macOS (con Homebrew)
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

---

## 2. Clonar y posicionarse en la rama BI

```bash
git clone https://github.com/Jonathan-Rivera-A/emergent-logistic-hub.git
cd emergent-logistic-hub
git fetch origin
git checkout BI-FUCTIONS
```

Estructura que tendrás:

```
.
├── backend/         # FastAPI + Mongo + módulos auth, bi
├── frontend/        # React + TypeScript + Vite
├── scripts/         # bootstrap.sh, seed_admin.sh
└── README.md        # documentación general
```

---

## 3. Configuración local — backend (FastAPI)

### 3.1 Variables de entorno

```bash
cd backend
cp .env.example .env
```

Edita `backend/.env` y deja como mínimo:

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="forjatec_transporte"
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"

# Genera tu propio secreto: openssl rand -hex 32
JWT_SECRET="REEMPLAZA_POR_64_HEX_ALEATORIOS"
JWT_TTL_MINUTES=720

ADMIN_EMAIL="admin@forjatec.com"
ADMIN_PASSWORD="fojatec11553"
ADMIN_NAME="Administrador Forjatec"

# Solo si vas a usar el login con Google:
SUPABASE_URL="https://TU-PROYECTO.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_..."
```

> ⚠️ **Nunca dejes `JWT_SECRET` con el valor del ejemplo en producción.** Genera
> uno único por entorno: `openssl rand -hex 32` y guárdalo en un secret manager.

### 3.2 Dependencias Python

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Esto instala FastAPI, Motor, Pandas, NumPy, slowapi, python-jose, passlib,
httpx, etc.

### 3.3 Dataset de telemetría

El módulo BI lee `backend/data/telemetria.csv` al arrancar. Si tu copia del
repo no lo trae (algunas plantillas lo excluyen por tamaño), copia el archivo
`MASTER_EXTRACTION_REPARADO_v4_718_rutas_170853_points_gps.csv` a esa ruta y
renómbralo:

```bash
mkdir -p data
cp /ruta/a/MASTER_EXTRACTION_REPARADO_v4_718_rutas_170853_points_gps.csv data/telemetria.csv
ls -la data/telemetria.csv     # debe pesar ~22 MB
```

Sin este archivo, los endpoints `/api/bi/*` responderán correctamente pero con
datos vacíos.

### 3.4 Arrancar el backend

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Verifica:

```bash
curl http://localhost:8001/api/auth/health
# {"status":"ok","supabase_configured":true}

curl -X POST http://localhost:8001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@forjatec.com","password":"fojatec11553"}'
# Debe responder con {"access_token":"...","user":{...}}
```

El usuario admin se siembra automáticamente en Mongo la primera vez. Si
cambias `ADMIN_PASSWORD` después, ejecuta `./scripts/seed_admin.sh` (no
sobrescribe, lo crea solo si no existe; para resetear, borra el doc de Mongo
y vuelve a arrancar).

---

## 4. Configuración local — frontend (Vite + React)

### 4.1 Variables de entorno

```bash
cd ../frontend
cp .env.example .env
```

Edita `frontend/.env`:

```env
REACT_APP_BACKEND_URL="http://localhost:8001"
VITE_BACKEND_URL="http://localhost:8001"

# Mismos valores del backend si vas a usar Google
VITE_SUPABASE_URL="https://TU-PROYECTO.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_..."

# Para la pestaña Monitor de rutas (Google Maps)
VITE_GOOGLE_MAPS_API_KEY="tu-api-key"
```

### 4.2 Dependencias

```bash
yarn install            # o: npm install
```

Esto instala React, Recharts, Leaflet + leaflet.heat, axios, date-fns,
@supabase/supabase-js, lucide-react, etc.

### 4.3 Arrancar el frontend

```bash
yarn dev                # o: yarn start, o: npm run dev
```

Abre http://localhost:3000

### 4.4 Probar el login y BI

1. Verás la pantalla de login (azul, centrada).
2. Email: `admin@forjatec.com`, contraseña: `fojatec11553`.
3. Tras `Ingresar`, vas al monitor de rutas.
4. Haz click en **BI** en el sidebar. Debes ver 6 KPI cards con números
   reales y 4 pestañas (Dashboard, Mapa de calor, Rutas frecuentes, Anomalías).
5. Logout con el botón "Cerrar sesión" en la parte inferior del sidebar.

---

## 5. Configuración Google OAuth (opcional pero recomendado)

El botón "Continuar con Google" en la pantalla de login depende de Supabase.

### 5.1 En Google Cloud Console

1. https://console.cloud.google.com/apis/credentials → "Create Credentials"
   → "OAuth client ID" → tipo "Web application".
2. **Authorized JavaScript origins**:
   - `http://localhost:3000` (desarrollo)
   - `https://tu-dominio.com` (producción)
3. **Authorized redirect URIs**:
   - `https://TU-PROYECTO.supabase.co/auth/v1/callback`
4. Copia el `Client ID` y `Client Secret`.

### 5.2 En Supabase (https://app.supabase.com)

1. Crea o abre tu proyecto.
2. **Authentication → Providers → Google → Enable**.
3. Pega `Client ID` y `Client Secret`.
4. En **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) / `https://tu-dominio.com` (prod)
   - Redirect URLs (añade los dos):
     - `http://localhost:3000/auth/callback`
     - `https://tu-dominio.com/auth/callback`
5. Copia `Project URL` y `anon public key` desde **Project Settings → API**.
6. Pégalos en `backend/.env` y `frontend/.env`:

```env
# Backend
SUPABASE_URL="https://TU-PROYECTO.supabase.co"
SUPABASE_ANON_KEY="..."

# Frontend
VITE_SUPABASE_URL="https://TU-PROYECTO.supabase.co"
VITE_SUPABASE_ANON_KEY="..."
```

7. Reinicia backend y frontend.

### 5.3 Cómo funciona el flujo

```
Usuario → /login → click "Continuar con Google"
       → supabase.auth.signInWithOAuth (Google login page)
       → Google → callback en Supabase → callback /auth/callback en frontend
       → AuthContext detecta sesión Supabase y llama a /api/auth/google-exchange
       → backend FastAPI verifica el token contra Supabase (/auth/v1/user)
       → backend hace upsert del usuario en Mongo (provider='google') y emite
         su propio JWT
       → frontend guarda { token, user } en localStorage y entra al dashboard
```

---

## 6. Despliegue en producción

### 6.1 Decisiones de arquitectura

| Componente | Recomendación                                                    |
|------------|------------------------------------------------------------------|
| Backend    | Uvicorn detrás de Nginx o Caddy, gestionado por systemd / PM2    |
| Frontend   | Build estático (`yarn build`) servido por Nginx o cualquier CDN  |
| MongoDB    | Servidor dedicado o MongoDB Atlas (M10+) con TLS                 |
| HTTPS      | Cert-bot/Let's Encrypt o el SSL del cloud (Caddy lo hace solo)   |
| Logs       | systemd-journald + filebeat / Datadog                            |
| Secrets    | AWS Secrets Manager, Vault, o variables de entorno en la plataforma |

### 6.2 Variables en producción (backend)

`/etc/transporte/backend.env`:

```env
MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
DB_NAME="forjatec_transporte"

# Lista cerrada de orígenes — NUNCA "*"
CORS_ORIGINS="https://transporte.tudominio.com"

# Secreto único, NO el del ejemplo
JWT_SECRET="<<openssl rand -hex 32>>"
JWT_TTL_MINUTES=720

ADMIN_EMAIL="admin@forjatec.com"
ADMIN_PASSWORD="<<contraseña fuerte para reemplazar la demo>>"
ADMIN_NAME="Administrador"

SUPABASE_URL="https://TU-PROYECTO.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_..."
```

### 6.3 Build y servicio del backend

```bash
cd /opt/transporte/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install "uvicorn[standard]" gunicorn
```

`systemd` unit (`/etc/systemd/system/transporte-backend.service`):

```ini
[Unit]
Description=Transporte FastAPI
After=network.target mongod.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/transporte/backend
EnvironmentFile=/etc/transporte/backend.env
ExecStart=/opt/transporte/backend/.venv/bin/gunicorn server:app \
          --workers 4 --worker-class uvicorn.workers.UvicornWorker \
          --bind 127.0.0.1:8001 --timeout 60 --access-logfile - --error-logfile -
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Activar:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now transporte-backend
sudo journalctl -fu transporte-backend
```

### 6.4 Build del frontend

```bash
cd /opt/transporte/frontend
# Variables de build (Vite las inyecta al bundle)
cat > .env.production << 'EOF'
REACT_APP_BACKEND_URL=https://api.transporte.tudominio.com
VITE_BACKEND_URL=https://api.transporte.tudominio.com
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_GOOGLE_MAPS_API_KEY=...
EOF

yarn install --frozen-lockfile
yarn build
# Salida: dist/
```

### 6.5 Nginx (sirve front y proxea backend)

`/etc/nginx/sites-available/transporte.conf`:

```nginx
# API backend
server {
    listen 443 ssl http2;
    server_name api.transporte.tudominio.com;
    ssl_certificate     /etc/letsencrypt/live/api.transporte.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.transporte.tudominio.com/privkey.pem;

    client_max_body_size 25M;        # CSV de telemetría
    proxy_read_timeout 60s;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend estático
server {
    listen 443 ssl http2;
    server_name transporte.tudominio.com;
    ssl_certificate     /etc/letsencrypt/live/transporte.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/transporte.tudominio.com/privkey.pem;

    root /opt/transporte/frontend/dist;
    index index.html;

    location / {
        try_files $uri /index.html;   # SPA: cualquier ruta sirve index.html
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name api.transporte.tudominio.com transporte.tudominio.com;
    return 301 https://$host$request_uri;
}
```

Activa:
```bash
sudo ln -s /etc/nginx/sites-available/transporte.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6.6 HTTPS con Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d transporte.tudominio.com -d api.transporte.tudominio.com
# Renovación automática vía cron/systemd-timer ya queda activa
```

### 6.7 Checklist de seguridad en producción

- [ ] `JWT_SECRET` único de 32 bytes, no commiteado.
- [ ] `CORS_ORIGINS` solo con tu dominio (sin `*`).
- [ ] HTTPS forzado en todo (frontend, backend, Supabase callbacks).
- [ ] Contraseña admin cambiada respecto a la demo y rotada cada 90 días.
- [ ] Mongo con autenticación + IP allowlist (Atlas: Network Access).
- [ ] Backups automáticos diarios de Mongo (Atlas tiene snapshots).
- [ ] Logs centralizados (revisa intentos de login fallidos en
      `journalctl -u transporte-backend | grep "Failed login"`).
- [ ] Rate limiting verificado (haz 6 logins fallidos seguidos, debe responder 429).
- [ ] Headers de seguridad en Nginx (`Strict-Transport-Security`,
      `X-Content-Type-Options`, `X-Frame-Options: DENY`).

```nginx
# Headers extra recomendados, dentro de ambos server blocks
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## 7. Despliegue alternativo — plataformas administradas

| Plataforma | Frontend                                | Backend                                   |
|------------|-----------------------------------------|-------------------------------------------|
| Vercel     | `yarn build` automático, deja `.env` en dashboard | usa Vercel Serverless Functions o externaliza el FastAPI |
| Netlify    | similar a Vercel                       | externaliza el backend                    |
| Railway    | `Dockerfile` opcional                  | añade Mongo plugin + ENV vars             |
| Fly.io     | volumen para Mongo                     | `flyctl deploy` con `fly.toml`            |
| Render     | Static Site para front + Web Service para backend | excelente, deploy directo desde Git |
| Emergent   | "Save to GitHub" + Deploy automático   | configura el `Procfile` con `uvicorn`    |

Cualquiera te sirve. La regla común es: **el frontend solo necesita las
`VITE_*` y `REACT_APP_BACKEND_URL`**, y **el backend necesita las del bloque
3.1 más conexión a Mongo y a Supabase**.

---

## 8. Verificación post-deploy (smoke test)

Desde tu máquina, contra el dominio real:

```bash
API="https://api.transporte.tudominio.com"

# 1. Health
curl -s "$API/api/auth/health"

# 2. Login
TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@forjatec.com","password":"NUEVA_PASS"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
echo "Token len=${#TOKEN}"

# 3. Endpoint protegido
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/bi/health"
# Debe devolver {"status":"ok","points_loaded":>0,...}

# 4. Rate limit (debe responder 429 a partir del 6º intento)
for i in 1 2 3 4 5 6 7; do
  curl -s -o /dev/null -w "%{http_code} " -X POST "$API/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"fake@x.com","password":"bad"}'
done; echo
```

Y desde el navegador en `https://transporte.tudominio.com`:

1. Pantalla de login carga (HTTPS válido, sin warnings).
2. Login con admin → entras al dashboard.
3. `/bi` muestra KPIs reales.
4. `/administrador` te muestra el contenido (solo si tu user es admin).
5. Logout → vuelves a `/login`.

---

## 9. Solución a errores comunes

| Error / Síntoma                                                            | Causa                                              | Solución                                                  |
|----------------------------------------------------------------------------|---------------------------------------------------|-----------------------------------------------------------|
| `yarn: command not found`                                                  | yarn no instalado                                 | `sudo npm install -g yarn` o usa `npm` en su lugar       |
| `Failed to resolve import "axios"` / `"leaflet"` al iniciar Vite           | falta `yarn install`                              | `cd frontend && yarn install`                            |
| `pydantic.errors.PydanticUserError: not fully defined`                     | mezcla de `from __future__ import annotations` + slowapi | ya corregido en backend; si reaparece, evita ese import en archivos con decoradores de slowapi |
| `supabaseUrl is required` (pantalla blanca)                                | falta `VITE_SUPABASE_URL`                         | añade ambas Supabase keys a `frontend/.env` y reinicia Vite |
| `Error cargando BI: Request failed with status code 401`                   | JWT expirado/inválido                             | ya hay redirect automático a `/login?reason=expired`; revisa que `JWT_SECRET` no haya cambiado |
| `Internal Server Error` en `/api/auth/login`                               | normalmente `JWT_SECRET` no definido o conexión Mongo caída | revisa `journalctl -u transporte-backend` o `tail -f /var/log/supervisor/backend.err.log` |
| `429 Too Many Requests`                                                    | rate limit (5/min login, 60/min BI)               | espera 60s; en producción detrás de un proxy, asegúrate de pasar `X-Real-IP` correctamente para que slowapi cuente por usuario y no por IP del proxy |
| `points_loaded: 0` en `/api/bi/health`                                     | falta `backend/data/telemetria.csv`               | copia el CSV y reinicia uvicorn                          |
| Google login falla con "redirect_uri_mismatch"                             | falta agregar `http://localhost:3000/auth/callback` (o tu dominio) en Google Cloud + Supabase | revisa sección 5                                          |
| Login con Google entra pero BI da 401                                      | `SUPABASE_URL` en backend no coincide con frontend | ambos deben apuntar al mismo proyecto                    |
| `EADDRINUSE: address already in use :::8001`                               | uvicorn ya corriendo en otra terminal             | `lsof -i:8001` y mata el proceso                         |

---

## 10. Operaciones diarias

```bash
# Ver logs en vivo
sudo journalctl -fu transporte-backend
tail -f /var/log/nginx/error.log

# Reiniciar tras cambiar .env
sudo systemctl restart transporte-backend

# Backup manual de Mongo
mongodump --uri="$MONGO_URL" --out=/backups/$(date +%F)

# Restaurar
mongorestore --uri="$MONGO_URL" /backups/2026-02-15

# Cambiar contraseña del admin
mongosh "$MONGO_URL"
> use forjatec_transporte
> db.users.deleteOne({email:"admin@forjatec.com"})
# Actualiza ADMIN_PASSWORD en backend/.env y reinicia: se recrea automáticamente
```

---

## 11. Tests

```bash
cd backend
python -m pytest tests/ -v
# 33 tests: 13 de auth + 20 de BI. Esperado: 33 passed.
```

Si fallan los de BI con 429, espera 60 segundos y reintenta — son los
contadores de rate limit acumulados de los tests de auth.

---

¿Algo más? Si encuentras un error que no está en la sección 9, comparte la
salida exacta (frontend devtools Network tab + `journalctl -u transporte-backend`)
para que la añada aquí.
