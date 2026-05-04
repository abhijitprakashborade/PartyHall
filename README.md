# PartyHub — Party Hall Booking Platform

A full-stack SaaS app for discovering and booking party halls in India. Built with Next.js 16, Django 5.2, PostgreSQL, Redis, and Docker.

I built this to solve a real problem — booking party halls in India is still mostly done over WhatsApp and phone calls. PartyHub lets customers browse verified halls, pick a package, and confirm a booking in under 2 minutes, while giving venue owners a proper dashboard to manage everything.

---

## What's Inside

### For Customers
- Browse and filter halls by city, capacity, and price
- Real-time slot availability (WebSocket-powered, 10-minute lock during checkout)
- 6 curated packages from ₹1,000 to ₹3,000
- Add-on services (photography, fog entry, cake, etc.)
- Digital QR code ticket on booking confirmation
- Leave reviews after completed bookings

### For Venue Partners
- Dashboard with revenue, occupancy, and booking analytics
- Multi-step hall creation with image upload and amenities
- Visual slot manager — add, block, or generate recurring slots
- Walk-in booking tool for phone/cash customers
- QR scanner for customer check-in
- Subscription-gated access (trial → paid plans)

### For Admins
- Platform-wide overview: bookings, revenue, new signups
- Approve or reject hall submissions
- Moderate customer reviews
- Manage subscription plans and partner limits

---

## Tech Stack

| | |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4, Framer Motion, MUI v7 |
| **Backend** | Django 5.2, Django REST Framework |
| **Real-time** | Django Channels 4 + Daphne (WebSocket) |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Auth** | JWT (access + refresh token rotation) |
| **Payments** | Razorpay, Cashfree, or Dummy (dev) |
| **Maps** | MapLibre GL + OpenFreeMap — free, no API key |
| **Infra** | Docker Compose (local), Vercel (frontend), VPS (backend) |

---

## Running Locally

### What you need
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for the backend stack
- [Node.js 20+](https://nodejs.org/) — for the frontend
- Git

### 1. Clone and set up

```bash
git clone https://github.com/YOUR_USERNAME/partyhub.git
cd partyhub

# Copy the env file — the defaults work out of the box for local dev
cp backend/.env.example backend/.env
cp party-hall-saas/.env.example party-hall-saas/.env.local
```

### 2. Start the backend

```bash
# Windows
dev.bat

# Mac / Linux
sh dev.sh
```

This starts PostgreSQL, Redis, and Django (with migrations) via Docker. Takes about 30 seconds on first run.

### 3. Start the frontend

```bash
cd party-hall-saas
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

### 4. Log in

| Role | Email | Password |
|---|---|---|
| Admin | `admin@partyhub.in` | `Admin@123!` |
| Partner | `john@example.com` | `Partner@123!` |

> The payment gateway defaults to `dummy` mode — bookings complete instantly with a single click, no real money involved.

---

## Project Structure

```
partyhub/
├── backend/                  # Django backend
│   ├── accounts/             # Custom user model, JWT auth
│   ├── bookings/             # Slot locking, booking flow, QR check-in
│   ├── halls/                # Hall, Package, AddonService, HallImage
│   ├── reviews/              # Reviews + admin moderation
│   ├── subscriptions/        # Partner subscription plans
│   ├── payments/             # Razorpay / Cashfree integration
│   ├── services/             # Shared utilities, price calculator
│   ├── config/               # Settings, URLs, ASGI
│   ├── Dockerfile
│   └── requirements.txt
│
├── party-hall-saas/          # Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx      # Landing page
│       │   ├── halls/        # Browse, detail, compare, map
│       │   ├── booking/      # Checkout wizard
│       │   ├── partner/      # Partner dashboard
│       │   ├── admin/        # Admin panel
│       │   └── user/         # Customer bookings, profile
│       ├── components/
│       │   ├── shared/       # Navbar, Footer, MapView
│       │   └── ui/           # Design system components
│       ├── context/          # Auth, Compare contexts
│       ├── hooks/            # useAuth, useWebSocket
│       └── lib/              # Axios client, utilities
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx/                    # Nginx config for production
└── README.md
```

---

## API

Interactive Swagger docs at **http://localhost:8000/api/docs/** when running locally.

| Group | Base Path |
|---|---|
| Auth | `/api/accounts/` |
| Halls | `/api/halls/` |
| Slots | `/api/slots/` |
| Bookings | `/api/bookings/` |
| Payments | `/api/payments/` |
| Reviews | `/api/reviews/` |
| Subscriptions | `/api/subscriptions/` |

WebSocket for real-time slot status:
```
ws://localhost:8000/ws/slots/<hall_id>/
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=*

# Database (matches docker-compose defaults)
DB_NAME=partyhub_db
DB_USER=partyhub
DB_PASSWORD=partyhub_pass
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_ACCESS_EXPIRY=60
JWT_REFRESH_EXPIRY=7

# Payment gateway: dummy | cashfree | razorpay
PAYMENT_GATEWAY=dummy

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (`party-hall-saas/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_PAYMENT_GATEWAY=dummy
```

---

## Deploying to Vercel (Frontend)

The frontend deploys to Vercel out of the box:

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com) — set root directory to `party-hall-saas`
3. Add environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` → your backend URL (e.g. `https://api.yourdomain.com/api`)
   - `NEXT_PUBLIC_WS_URL` → `wss://api.yourdomain.com`
   - `NEXT_PUBLIC_PAYMENT_GATEWAY` → `razorpay`

For the backend, deploy Django + PostgreSQL + Redis to any VPS (DigitalOcean, Railway, Render, AWS EC2).

---

## User Roles

| Role | What they can do |
|---|---|
| **Customer** | Browse halls, book slots, view/cancel bookings, submit reviews |
| **Partner** | Everything above + manage halls, slots, packages, view analytics |
| **Admin** | Full platform access — approve halls, manage users, moderate reviews |

Partners can only access their own data — enforced at the database query level, not just the UI.

---

## License

MIT — free to use, modify, and distribute.
