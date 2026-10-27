# PropAI – AI Real Estate Lead Qualification & Property Recommendation Platform
### Exclusively Built for **Lyka Realty** (Dubai, UAE & India NRI Corridor • [lykarealty.ae](https://lykarealty.ae))

![Lyka Realty PropAI](frontend/public/lyka-logo.svg)

**PropAI** is a realistic, production-ready full-stack real-estate intelligence platform designed for **Lyka Realty**, an elite luxury brokerage based in **Office 1002, DAMAC Executive Heights, Barsha Heights, Dubai, UAE**. 

The platform allows property buyers and global/NRI investors to communicate with an **AI Real Estate Assistant using either natural text or voice**, describe their property requirements casually in conversational terms, and receive instant, personalized property recommendations with **transparent, explainable AI rationale**. Concurrently, the platform performs automated lead qualification, dynamic 0–100 lead scoring, and pipeline tracking for real estate agents and brokers.

---

## 1. Key Features

### For Property Buyers & Investors (Customer Role)
* **Conversational AI Property Advisor (`/assistant`)**:
  * **Text Mode**: Casual conversational input with real-time intent extraction.
  * **Voice Mode**: "🎙 Start Speaking" with Web Speech API speech-to-text, live waveform, and pre-submission transcription display.
  * **Zero Missing-Field Fabrication**: The AI never hallucinates missing criteria; it asks natural, progressive follow-up questions for budget, locality, bedrooms, or timeline.
  * **Live Structured Extraction Box**: Renders JSON state in real time as the conversation progresses.
  * **Live Lead Qualification Meter**: Shows instant 0–100 score, factor breakdown, and intent badge (🔥 HOT LEAD, ⚡ WARM LEAD, ❄️ COLD LEAD).
  * **Top 5 Live Recommendations Shelf**: Matches real database inventory with percentage similarity scores and bulleted reasons.
* **Property Search & Exploration (`/properties`)**:
  * Filter across **1,900+ real Dubai properties** and verified demo listings.
  * Filter by Locality (*Downtown Dubai, Palm Jumeirah, Dubai Marina, Business Bay, JLT, Chennai OMR, Anna Nagar*), BHK, Budget Slider, Furnishing, Parking, and Data Origin.
  * Dynamic Currency Switcher (**AED** Dirhams and **INR ₹** Lakhs/Crores).
  * Sorting by Newest, Price (Low/High), and Largest Area.
* **Explainable Property Details (`/properties/[id]`)**:
  * High-resolution architectural gallery.
  * **"AI Match: 94%" & "Why this matches you"** explainable rationale.
  * Specifications: BHK, Baths, Super Area, Carpet Area, Elevation, Metro Distance.
  * CTAs: "Schedule VIP Site Visit", "WhatsApp Client Director", and "Save Property".
* **Customer Advisory Hub (`/dashboard`)**:
  * **My Requirements Card**: Quick snapshot of active budget, location, BHK, and timeline.
  * AI Recommendations tailored to profile.
  * Saved / Favorite properties.
  * Scheduled site visits with confirmation status.

### For Real Estate Agents & Brokers (Agent/Admin CRM Role)
* **Broker CRM Dashboard (`/agent`)**:
  * **Executive KPIs**: Total Leads, Hot Leads, Warm Leads, Cold Leads, Inventory Count, Site Visits, and Conversion Rate.
  * **Lead Pipeline Stages**:
    $$\text{New Lead} \longrightarrow \text{AI Qualified} \longrightarrow \text{Properties Recommended} \longrightarrow \text{Interested} \longrightarrow \text{Site Visit} \longrightarrow \text{Negotiation} \longrightarrow \text{Converted}$$
  * **Lead Management Table**: Filter by Hot, Warm, Cold; search by customer name, phone, or neighborhood.
  * **Detailed Lead Inspection Drawer**:
    * Full customer requirements breakdown.
    * **AI Lead Executive Summary** (e.g. *"Customer is looking for a 2 BHK apartment in Downtown Dubai with a budget of AED 2.2M – 3.0M..."*).
    * One-click pipeline stage updates.
    * Recommended properties and scheduled visits for each lead.
  * **Interactive Visual Analytics**:
    * Pipeline conversion funnel chart.
    * Leads by prime community distribution.
    * Budget distribution tiers.
  * **Property Management**: Add new property listings, update pricing, and delete listings.

---

## 2. Architecture & Technology Stack

```
                     ┌─────────────────────────────────────────┐
                     │          Next.js 16 (React 19)          │
                     │  TypeScript, Tailwind CSS, Lucide Icons │
                     └────────────────────┬────────────────────┘
                                          │ REST API / JSON
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │            FastAPI (Python 3.11)         │
                     │  Pydantic V2, SQLAlchemy, Uvicorn       │
                     └──────┬─────────────┬─────────────┬──────┘
                            │             │             │
        ┌───────────────────┴──┐   ┌──────┴──────────┐  │
        ▼                      ▼   ▼                 ▼  ▼
┌──────────────┐     ┌─────────────────────┐    ┌─────────────────┐
│ Requirement  │     │ Weighted Multi-Tier │    │ Lead Intent     │
│ Extraction   │     │ Recommendation      │    │ Scoring Model   │
│ Service      │     │ Engine (30/20/15/..)│    │ (0 - 100 Pts)   │
└──────────────┘     └─────────────────────┘    └─────────────────┘
                               │
                               ▼
              ┌─────────────────────────────────┐
              │ SQLite / PostgreSQL (SQLAlchemy)│
              │ 1,900+ Dubai Dataset Properties │
              │ Leads, Conversations, Visits    │
              └─────────────────────────────────┘
```

### Frontend
- **Framework**: Next.js 16.4 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 with bespoke luxury dark theme (`#090A0D`), desert gold accents (`#C5A869`), and smooth micro-animations.
- **Icons**: Lucide React
- **Voice Recognition**: HTML5 Web Speech API with fallback simulated audio stream.

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Data Validation & Schemas**: Pydantic v2
- **ORM & Database**: SQLAlchemy 2.0 with SQLite (zero-config local run) and PostgreSQL compatibility via `DATABASE_URL`.
- **Security & Authentication**: PBKDF2-HMAC-SHA256 password hashing + HS256 JWT tokens.

### Machine Learning & Recommendation Logic
- **Weighted Multi-Factor Recommendation Engine**:
  * Budget compatibility: 30%
  * Location & neighborhood compatibility: 20%
  * Property type matching: 15%
  * BHK bedroom count: 10%
  * Area / sqft spaciousness: 10%
  * Amenities match: 5%
  * Metro / accessibility: 5%
  * Availability & timeline: 5%
- **Lead Scoring Engine**:
  * Budget clarity (20%) + Specification (20%) + Timeline (20%) + Location clarity (15%) + Property type/BHK (15%) + Engagement (10%)
  * Classification: Hot ($\ge 80$), Warm ($50-79$), Cold ($< 50$).

---

## 3. Dataset Information

* **Primary Source**: `properties_data_AED.csv`
  * 1,905 verified secondary and off-plan properties in Dubai, UAE across Downtown Dubai, Palm Jumeirah, Dubai Marina, Business Bay, Jumeirah Lake Towers, and Dubai Hills Estate.
  * Fields: `id`, `neighborhood`, `latitude`, `longitude`, `price`, `size_in_sqft`, `price_per_sqft`, `no_of_bedrooms`, `no_of_bathrooms`, `quality`, and 25 individual boolean amenities.
* **Secondary / Demo Source**:
  * 15 realistic Chennai tech corridor records (Anna Nagar, Adyar, Velachery, OMR, Sholinganallur, etc.).
* **Data Integrity Distinction**:
  * As required by the specification, the application explicitly flags whether a property is an actual market record (`is_dataset_record=True`) or a synthetic/demo property (`is_dataset_record=False`) with distinct visual badges.

---

## 4. Getting Started & Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
From the project root:

```bash
# Optional: create a virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate

# Install dependencies if not already present
pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings pandas numpy requests httpx python-multipart

# Import dataset & populate the database (1,900+ properties + CRM demo data)
python backend/scripts/import_dataset.py

# Start the FastAPI backend
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will run at **`http://127.0.0.1:8000`** with interactive Swagger documentation at **`http://127.0.0.1:8000/docs`**.

### 2. Frontend Setup
In a new terminal window:

```bash
cd frontend

# Install frontend dependencies (if not already installed)
npm install

# Start the Next.js development server
npm run dev
```

The application is now live at **`http://localhost:3000`**!

---

## 5. Enterprise Credentials
Official corporate staff authentication:
- **Sales Advisor (1 of 12)**: `rajesh.sharma@lykarealty.ae` (Password: `password123`)
- **Sales Manager**: `fatima.alzaabi@lykarealty.ae` (Password: `password123`)
- **Administrator**: `alexander.vance@lykarealty.ae` (Password: `password123`)
- **Customers**: Customers sign up directly with their own verified personal email address.

---

## 6. API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user & obtain JWT token |
| `POST` | `/api/auth/register` | Register new customer or agent account |
| `POST` | `/api/ai/chat` | Main conversational AI advisory endpoint |
| `POST` | `/api/ai/extract-requirements` | Natural language structured extraction |
| `POST` | `/api/ai/voice/transcribe` | Voice speech-to-text transcription |
| `GET` | `/api/properties` | Search & filter property inventory |
| `GET` | `/api/properties/{id}` | Retrieve single property specifications |
| `POST` | `/api/properties` | Create new listing (Agent only) |
| `DELETE` | `/api/properties/{id}` | Delete listing (Agent only) |
| `GET` | `/api/leads` | Retrieve CRM leads with Hot/Warm/Cold filters |
| `PUT` | `/api/leads/{id}` | Update lead pipeline status |
| `POST` | `/api/site-visits` | Request VIP property viewing |
| `GET` | `/api/dashboard/analytics` | Broker KPI metrics & funnel statistics |

---

## 7. Company Details
* **Company**: Lyka Realty
* **Website**: [lykarealty.ae](https://lykarealty.ae)
* **Headquarters**: Office 1002, DAMAC Executive Heights, Barsha Heights, Dubai, UAE
* **Phone / WhatsApp**: +971 4 456 7890 / +971 50 123 4567
* **Email**: concierge@lykarealty.ae
