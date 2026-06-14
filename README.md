# Pottenbakkerij Grolle Monorepo

Productieklare basis voor Pottenbakkerij Grolle met:

- Django + Django REST Framework backend
- React + Material UI frontend
- PostgreSQL database
- Docker Compose voor lokale ontwikkeling
- Environment-gedreven configuratie via `.env`
- Healthcheck endpoint
- JWT authenticatie en rolgebaseerde autorisatie
- Basis logging en CORS-configuratie

## Monorepo Structuur

```text
.
├── apps
│   ├── backend
│   │   ├── config
│   │   │   └── settings
│   │   ├── core
│   │   ├── Dockerfile
│   │   ├── entrypoint.sh
│   │   ├── manage.py
│   │   └── requirements.txt
│   └── frontend
│       ├── src
│       │   └── components
│       ├── Dockerfile
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
├── packages
│   ├── config
│   └── ui
├── .env.example
├── docker-compose.yml
└── README.md
```

## Waarom Deze Structuur Schaalbaar Is

- `apps/backend`: API en domeinlogica, later uit te breiden met apps als `shop`, `orders`, `inventory`.
- `apps/frontend`: klantgerichte webapp, later uit te breiden met routes voor catalogus, checkout en account.
- `packages/ui`: gedeelde UI componenten voor storefront en eventuele admin portal.
- `packages/config`: gedeelde lint/build/config bestanden zodat teams consistent werken.

## Snel Starten (Lokaal)

1. Kopieer environment bestand:

```bash
cp .env.example .env
```

2. Build en start alle services:

```bash
docker compose up --build
```

3. Open applicaties:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/healthz/
- Producten API: http://localhost:8000/api/products/
- Django admin: http://localhost:8000/admin/

## Seed Data

Voor lokale demo-data (producten) voer je uit:

```bash
docker compose exec backend python manage.py seed_products
```

Dit command is idempotent: bestaande records worden geupdate op basis van slug.

## Authenticatie en Rollen

De API gebruikt JWT (access + refresh) met rollen:

- `admin`
- `medewerker`
- `klant`

Standaard krijgen nieuwe registraties de rol `klant`.

### Auth Endpoints

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/token/refresh/`
- `GET /api/auth/profile/`
- `GET /api/auth/role-check/`

### Planning en Boekingen

- `GET/POST /api/planning/`
- `GET/PATCH/DELETE /api/planning/<id>/`
- `GET/POST /api/bookings/`
- `GET /api/bookings/<id>/`

Rechten:

- `admin` en `medewerker`: beheerrechten op planningdata.
- `klant`: kan alleen eigen boekingen zien.

### Voorbeeld Login

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
	-H "Content-Type: application/json" \
	-d '{"username":"klant1","password":"Klant12345!"}'
```

## Frontend Auth en Routeguards

In de React frontend is JWT-auth gekoppeld aan routeguards:

- `/account` alleen voor ingelogde gebruikers
- `/bookings` alleen voor ingelogde gebruikers
- `/planning` alleen voor rollen `admin` en `medewerker`

Tokens worden lokaal opgeslagen en bij verlopen access token probeert de frontend automatisch te refreshen via `/api/auth/token/refresh/`.

## Belangrijke Configuraties

### Environment Variabelen

Alle benodigde variabelen staan in `.env.example`, onder andere:

- `DATABASE_URL`
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `VITE_API_BASE_URL`

### Healthcheck Endpoint

- Endpoint: `GET /api/healthz/`
- Response bevat status, servicenaam en timestamp.

### Logging

Django logging is ingesteld naar stdout met timestamp, loglevel en loggernaam.
Dit werkt direct in Docker logs en is geschikt als basis voor latere centralisatie.

### CORS

CORS is geconfigureerd met `django-cors-headers`.
Toegestane origins worden ingesteld via `CORS_ALLOWED_ORIGINS`.

## Productie-Aandachtspunten

Voor deployment:

- Zet `DJANGO_ENV=production`
- Gebruik een sterke `DJANGO_SECRET_KEY`
- Gebruik veilige hosts in `DJANGO_ALLOWED_HOSTS`
- Activeer TLS in reverse proxy / load balancer
- Voeg CI/CD, testpipeline en secrets management toe

### Productie Deploy (Nginx Only)

Gebruik voor productie standaard alleen `db`, `backend`, `frontend` en laat host-nginx reverse proxy doen.

1. Eerste keer op server:

```bash
chmod +x scripts/deploy-prod-nginx.sh
```

2. Uitrollen:

```bash
./scripts/deploy-prod-nginx.sh
```

3. Handmatig alternatief:

```bash
docker compose -f docker-compose.prod.yml up -d --build db backend frontend
sudo nginx -t && sudo systemctl reload nginx
```

### Optioneel Caddy Starten

Caddy staat bewust in apart bestand en start niet mee bij normale productie deploy:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.caddy.yml up -d caddy
```

## Volgende Uitbreidingsstappen Voor Webshop

- Nieuwe Django apps: `shop`, `orders`, `payments`, `customers`
- DRF authenticatie en permissies
- Productmedia opslag (S3-compatible)
- Betalingsintegratie (bijv. Mollie)
- Shared design system in `packages/ui`
