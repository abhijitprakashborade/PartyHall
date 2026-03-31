

# 🎉 PartyHub — Premium Party Hall Booking Platform

**A full-stack SaaS platform for discovering, booking, and managing party halls — built with Next.js 16, Django 5.2, PostgreSQL, Redis, and Docker.**

**PartyHub** bridges venue owners and customers — partners list and manage their halls, customers browse and instantly book, and admins oversee the entire platform, all in real time.



---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Environment Setup](#️-environment-setup)
- [📁 Project Structure](#-project-structure)
- [🔌 API Reference](#-api-reference)
- [👥 User Roles](#-user-roles)
- [🗺️ Key Flows](#️-key-flows)
- [📸 Screenshots](#-screenshots)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Features

### 🎯 For Customers
- **Browse & Search** — Filter halls by city, capacity, price, and distance (pincode-based geo search)
- **Slot Selection** — Interactive calendar to pick single or non-contiguous multi-slot bookings
- **Real-Time Lock** — Slots locked for 10 minutes via WebSocket during checkout (race-condition safe)
- **Package Wizard** — Step-by-step booking wizard with Silver / Gold / Platinum / custom packages
- **Add-on Services** — Photography, catering, decoration, fog machine & more
- **Live Price Calculator** — Real-time server-side pricing with multi-slot discounts and gap fees
- **QR Code Tickets** — Digital booking ticket with scannable QR code for check-in
- **Review System** — Submit verified reviews after completed bookings; admin approval workflow

### 🏢 For Partners (Venue Owners)
- **Partner Dashboard** — Revenue analytics, booking trends, occupancy rate charts
- **Hall Management** — Multi-step hall creation wizard with image upload, amenities & location
- **Slot Manager** — Visual calendar to add/block time slots; one-click sub-slot generation
- **Package & Add-on Builder** — Tiered packages with guest pricing, duration modes, and visibility controls
- **Walk-in Booking** — Partner-created bookings for phone/cash customers
- **QR Scanner** — Scan customer QR codes for check-in / check-out
- **Subscription Gating** — Trial (1 hr), paid plans with per-hall limits
- **Pricing Controls** — Configure gap fees, extra-guest rates, multi-slot discounts

### 🛡️ For Admins
- **Platform Overview** — Revenue, user growth, booking volume, hall status at a glance
- **Hall Approvals** — Review, approve, or reject partner hall submissions with notes
- **User Management** — View, suspend, or manage all customers and partners
- **Review Moderation** — Approve or reject customer reviews
- **Plan Management** — Create and manage subscription tiers and limits

### ⚡ Platform-Wide
- **Dark / Light Mode** — System-aware theme toggling
- **Fully Responsive** — Mobile-first design (iPhone 14 Pro tested)
- **Interactive Map** — MapLibre GL + OpenFreeMap (no API key, no limits)
- **Hall Comparison** — Side-by-side compare up to 3 halls
- **PWA Ready** — Offline page, service worker support
- **JWT Authentication** — Access + refresh token rotation, silent refresh
- **Data Isolation** — Strict per-partner queryset filtering; no cross-partner data leakage

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser / Client                     │
│                Next.js 16 (App Router, RSC)               │
│        Tailwind CSS  •  Framer Motion  •  MUI             │
└───────────────────────────┬─────────────────────────────-┘
                            │  HTTP (REST) + WebSocket
                ┌───────────▼──────────────┐
                │   Django 5.2 + Channels   │
                │   Daphne ASGI Server      │
                │   DRF  •  SimpleJWT       │
                └──────┬───────────┬────────┘
                        │           │
              ┌─────────▼─┐   ┌────▼──────┐
              │ PostgreSQL │   │  Redis 7  │
              │    16      │   │ (channels │
              │  (primary) │   │  + cache) │
              └────────────┘   └───────────┘
```

All services run via **Docker Compose** — single command startup.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | Next.js 16.2 (App Router), React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4, Framer Motion, MUI v7 |
| **UI Components** | Radix UI, Lucide Icons, Recharts, Sonner |
| **Maps** | MapLibre GL 5 + OpenFreeMap (free, no key) |
| **HTTP Client** | Axios (with interceptors + silent refresh) |
| **Forms** | React Hook Form + Zod |
| **QR Codes** | `qrcode` + `react-qr-code` |
| **Backend Framework** | Django 5.2 + Django REST Framework 3.15 |
| **Real-time** | Django Channels 4.1 + Daphne 4.1 (ASGI) |
| **Auth** | JWT (djangorestframework-simplejwt 5.3) |
| **Database** | PostgreSQL 16 (via psycopg2) |
| **Cache / Pub-Sub** | Redis 7 (channels-redis 4.2) |
| **Payments** | Razorpay + Cashfree PG |
| **Geo** | pgeocode (pincode → lat/lng, India) |
| **Image Processing** | Pillow 10 |
| **API Docs** | drf-spectacular (OpenAPI 3 / Swagger) |
| **Containerization** | Docker + Docker Compose |

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Node.js 20+](https://nodejs.org/) (for frontend dev server)
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/partyhub.git
cd partyhub
```

### 2. Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your values (see Environment Setup below)
```

### 3. Start all backend services with Docker

```bash
docker-compose up -d
```

This starts:
- `partyhub_backend` — Django + Daphne on `:8000`
- `partyhub_db` — PostgreSQL 16 on `:5432`
- `partyhub_redis` — Redis 7 on `:6379`

### 4. Start the frontend

```bash
cd party-hall-saas
npm install
npm run dev
```

Frontend available at **http://localhost:3000**

### 5. Seed demo data (optional)

```bash
docker exec -it partyhub_backend python scripts/create_demo_users.py
```

Creates demo admin, partner, and customer accounts.

---

## ⚡ Quick Setup Guide for Friends

If you just cloned this repo, here is the fastest way to get it running:

1. **Install Docker Desktop**.
2. **Launch everything with one command**:
   - **Windows**: Run `dev.bat`
   - **Mac / Linux**: Run `sh dev.sh`
3. **Seed demo data (optional)**:
   ```bash
   docker exec -it partyhub_backend python scripts/create_demo_users.py
   ```
4. **Login**:
   - **Admin**: `admin@partyhub.com` / `admin123`
   - **Partner**: `partner@partyhub.com` / `partner123`
   - **Customer**: `user@partyhub.com` / `user123`

---

## ⚙️ Environment Setup

Create `backend/.env` from the example below:

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,backend

# Database (matches docker-compose defaults)
DB_HOST=db
DB_PORT=5432
DB_NAME=partyhub_db
DB_USER=partyhub
DB_PASSWORD=partyhub_password

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_SIGNING_KEY=your-jwt-signing-key

# Payments (optional)
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
CASHFREE_APP_ID=your_app_id
CASHFREE_SECRET_KEY=your_secret

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## 📁 Project Structure

```
partyhub/
├── backend/                    # Django Backend
│   ├── accounts/               # Custom User model (customer/partner/admin roles)
│   ├── bookings/               # Slot locking, booking creation, QR check-in
│   ├── halls/                  # PartyHall, Package, AddonService, HallImage
│   ├── reviews/                # Customer reviews + admin approval
│   ├── subscriptions/          # Partner subscription plans + admin logs
│   ├── services/               # PriceCalculator, shared utilities
│   ├── payments/               # Razorpay / Cashfree payment integration
│   ├── config/                 # Django settings, URLs, ASGI config
│   ├── Dockerfile
│   └── requirements.txt
│
├── party-hall-saas/            # Next.js 16 Frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Landing page
│       │   ├── halls/          # Hall listing, detail, compare, map view
│       │   ├── book/           # Multi-step booking wizard
│       │   ├── partner/        # Partner dashboard, hall/slots/packages mgmt
│       │   ├── admin/          # Admin panel (users, halls, reviews, analytics)
│       │   ├── user/           # Customer bookings, profile
│       │   ├── register/       # Customer registration
│       │   └── login/          # Authentication
│       ├── components/
│       │   ├── shared/         # Navbar, Footer, MapView, QRModal
│       │   └── ui/             # Radix-based design system components
│       ├── context/            # AuthContext, CompareContext
│       ├── hooks/              # useAuth, useBooking, useWebSocket
│       └── lib/                # Axios API client, auth cache, utilities
│
├── docker-compose.yml
└── README.md
```

---

## 🔌 API Reference

The backend exposes a full REST API at `http://localhost:8000/api/`.

Interactive Swagger docs: **http://localhost:8000/api/schema/swagger-ui/**

| Endpoint Group | Base Path | Auth Required |
|---|---|---|
| Authentication | `/api/accounts/` | No |
| Halls | `/api/halls/` | Read: No, Write: Partner |
| Packages | `/api/packages/` | Read: No, Write: Partner |
| Add-ons | `/api/addons/` | Read: No, Write: Partner |
| Slots | `/api/slots/` | Read: No, Lock/Manage: Auth |
| Bookings | `/api/bookings/` | Yes |
| Reviews | `/api/reviews/` | Yes |
| Subscriptions | `/api/subscriptions/` | Partner |
| Payments | `/api/payments/` | Yes |

### WebSocket

Real-time slot status updates via WebSocket:

```
ws://localhost:8000/ws/slots/<hall_id>/
```

---

## 👥 User Roles

| Role | Access |
|---|---|
| **Customer** | Browse halls, book slots, manage own bookings, submit reviews |
| **Partner** | All customer access + manage own halls, slots, packages, view own bookings & analytics |
| **Admin** | Full platform access — approve halls, manage users, moderate reviews, view global analytics |

> 🔒 **Data Isolation**: Partners can ONLY access their own halls and bookings. The backend enforces this at the queryset level — no filtering on the frontend.

---

## 🗺️ Key Flows

### Booking Flow
```
Browse Halls → Select Hall → Choose Package & Date
→ Pick Slots (WebSocket lock) → Add-ons & Guest Count
→ Live Price Calculation → Confirm Booking
→ QR Code Ticket Generated
```

### Partner Onboarding
```
Register as Partner → Create Hall (wizard)
→ Add Images, Packages, Add-ons → Go Live (trial auto-starts)
→ Manage Slots → Accept Bookings → Check-in via QR
```

### Review Flow
```
Customer completes booking → Submit review (1–5 stars + comment)
→ Admin approves → Rating auto-updates on hall listing
```

---

## 📸 Screenshots

> Add screenshots to `/docs/screenshots/` and update paths below.

| Hall Listing | Hall Detail | Booking Wizard |
|---|---|---|
| *(coming soon)* | *(coming soon)* | *(coming soon)* |

| Partner Dashboard | Admin Panel | QR Check-in |
|---|---|---|
| *(coming soon)* | *(coming soon)* | *(coming soon)* |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ for event professionals and celebration lovers.**

⭐ Star this repo if you found it useful!

</div>
