
# Transformer Thermal Inspection System (Phase 1)

> **Course:** EN3350 – Software Design Competition · University of Moratuwa  
> **Phase:** 1 — Transformer & Baseline Image Management  
> **Status:** Working demo with backend API + React UI (shadcn)  
> **Date:** 2025-08-24

---

##  Phase 1 Delivers

Phase 1 focuses on the foundation of the system: recording transformers and
managing their baseline thermal images with environment tags. It aligns with the
competition brief (Section 3 in the project outline PDF) and covers:

- **FR1.1 – Admin interface for transformer management** (add/list/star).
- **FR1.2 – Thermal image upload tagged to an inspection/transformer.**
- **FR1.3 – Baseline categorization by environmental conditions** (Sunny/Cloudy/Rainy).

> The remaining phases (AI anomaly detection, annotation, record sheet) are
> scaffolded in the UI but not part of Phase 1’s scope.

---

##  Repository structure

```
.
├─ backend/                    # Spring Boot 3.5.x (Java 17, Maven wrapper)
│  ├─ src/main/java/com/example/sti/
│  │  ├─ controller/          # REST controllers
│  │  │  ├─ TransformerController.java
│  │  │  ├─ InspectionController.java
│  │  │  └─ UploadController.java
│  │  ├─ entity/              # JPA entities (Transformer, Inspection, ImageAsset)
│  │  ├─ repo/                # JPA repositories
│  │  ├─ service/             # StorageService (saves images to disk)
│  │  └─ StiBackendApplication.java
│  └─ src/main/resources/application.yml  # Postgres + storage config
│
├─ frontend/                   # React + TypeScript + Vite + Tailwind + shadcn/ui
│  ├─ src/pages/               # Dashboard, TransformerDetail, Inspections, etc.
│  ├─ src/components/          # Layout + shadcn primitives
│  └─ package.json
│
└─ docs/
   ├─ In21-EN3350-Project Outline.pdf     # Project brief
   └─ images/                             # UI screenshots (add 8 files here)
```

> **Tip:** Keep the PDF at `docs/` and place the 8 screenshots under
> `docs/images/` with the same filenames shown below so the README previews work.

---

## Tech stack

- **Backend:** Spring Boot 3.5.5 · Java 17 · Spring Data JPA · Validation · PostgreSQL
- **Frontend:** React 18 · TypeScript · Vite · Tailwind · shadcn/ui · lucide-react
- **Storage:** Local filesystem for uploaded images (`storage/` by default)
- **Docs:** `docs/In21-EN3350-Project Outline.pdf`

---

##  Getting started

### 1) Prerequisites
- Node.js 20+
- Java 17+
- PostgreSQL 14+ (or compatible)

### 2) Database (Postgres)
Create a database and user that match `backend/src/main/resources/application.yml`:

```sql
CREATE DATABASE sti;
CREATE USER sti WITH ENCRYPTED PASSWORD 'sti';
GRANT ALL PRIVILEGES ON DATABASE sti TO sti;
```

> To override DB settings at runtime, set env vars:
> `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`.

### 3) Backend
```bash
cd backend
# optional: change server port or storage base in application.yml
./mvnw spring-boot:run

# health check
curl http://localhost:8080/api/ping
# -> "pong"
```

**Defaults (from `application.yml`):**
- Port: **8080**
- DB: `jdbc:postgresql://localhost:5432/sti` (user: `sti`, password: `sti`)
- File uploads: `storage/` (absolute path will be resolved under your project root)
- Swagger UI: **/swagger**

### 4) Frontend
```bash
cd frontend
# configure API base (create .env.local)
echo "VITE_API_URL=http://localhost:8080" > .env.local

npm install
npm run dev
```

Open **http://localhost:5173**

---

## Seeding quick demo data

Create a few transformers (FR1.1):

```bash
curl -X POST http://localhost:8080/api/transformers   -H "Content-Type: application/json"   -d '{{"transformerNo":"AZ-8890","region":"Nugegoda","type":"Bulk","capacity":"2500kVA"}}'

curl -X POST http://localhost:8080/api/transformers   -H "Content-Type: application/json"   -d '{{"transformerNo":"AZ-1649","region":"Nugegoda","type":"Bulk","capacity":"2500kVA"}}'

curl -X GET http://localhost:8080/api/transformers
```

Create an inspection and upload an image (FR1.2/FR1.3):

```bash
# 1) Find a transformer id from the GET response above (e.g., id=1)

# 2) Create an inspection record
curl -X POST http://localhost:8080/api/transformers/1/inspections   -H "Content-Type: application/json"   -d '{{"status":"IN_PROGRESS","starred":false,"notes":"Baseline — Sunny"}}'

# Assume the returned inspection id is 5
# 3) Upload a thermal image to the inspection (multipart)
curl -X POST "http://localhost:8080/api/inspections/5/images"   -F file=@/path/to/thermal.jpg
```

> **Environment tag (Sunny/Cloudy/Rainy):** In Phase 1, we store this as part of the
> inspection notes/metadata. The UI exposes a selector; the backend stores it in the
> inspection/image metadata (simple string for now).

---

## API

- `GET  /api/ping` → `"pong"`
- **Transformers**
  - `GET  /api/transformers` → list
  - `POST /api/transformers` → create (body: `transformerNo`, `region`, `type`, `capacity`, `starred?`)
  - `PATCH /api/transformers/{id}/star` → `{{ "starred": true|false }}`
- **Inspections**
  - `GET  /api/transformers/{transformerId}/inspections` → list by transformer
  - `POST /api/transformers/{transformerId}/inspections` → create (body: `status`, `starred?`, `notes?`)
- **Images**
  - `POST /api/inspections/{inspectionId}/images` (`multipart/form-data`, field name `file`) → saves to `storage/inspections/{inspectionId}/`
  - `GET  /api/inspections/{inspectionId}/images` → list files for that inspection

> Files are sanitized and stored on disk by `StorageService`. The DB stores the
> path and metadata. Swagger UI is available at `/swagger` for exploration.

---

##  Frontend pages 

- **/dashboard** – Transformers table (search/filter/star marker UI).
- **/transformer/:id** – Transformer detail + inspection list.
- **/transformer/:id/inspection/:inspectionId/upload** – Thermal image uploader with progress + preview.
- **/inspections** – All inspections (table view, filters).
- **/add_transformer** – Guided flow to create a transformer and upload a baseline image.

> **Compatibility note:** Some early UI screens use older endpoints
> (`/api/add_transformer`, `/api/upload_baseline_transformer`). For this repo,
> the **backend API** is the consolidated set listed above. If you use those screens,
> update the constants at the top of `frontend/src/pages/AddTransformer.tsx` to:
>
> ```ts
> const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
> const CREATE_URL = `${API_BASE}/api/transformers`;
> // After creating an inspection, upload image via:
> // POST `${API_BASE}/api/inspections/{inspectionId}/images`
> ```

---

## UI preview

> Place these images under `docs/images/` in your repo.

| Screen | Image |
|---|---|
| Thermal image **comparison** (baseline vs current) | ![Thermal image comparison](docs/images/Screenshot%202025-08-23%20155331.png) |
| Thermal image **upload** progress | ![Upload progress](docs/images/Screenshot%202025-08-23%20155317.png) |
| Thermal image **upload** (pending state) | ![Upload pending](docs/images/Screenshot%202025-08-23%20155306.png) |
| **New Inspection** dialog | ![New inspection dialog](docs/images/Screenshot%202025-08-23%20155254.png) |
| Transformer **inspections list** | ![Transformer inspections](docs/images/Screenshot%202025-08-23%20155242.png) |
| **All inspections** | ![All inspections](docs/images/Screenshot%202025-08-23%20155231.png) |
| **Transformers** list | ![Transformers list](docs/images/Screenshot%202025-08-23%20155220.png) |
| **Add Transformer** dialog | ![Add transformer](docs/images/Screenshot%202025-08-23%20155129.png) |

---

## What’s implemented

- Create/list transformers (FR1.1)
- Create inspections against transformers (used as container for baseline/current images)
- Upload & persist images to disk with DB metadata (FR1.2)
- Simple environment tagging stored in notes/metadata (FR1.3)
- React UI with shadcn components and navigation

<!-- ### Known limitations / To‑do
- No authentication/authorization yet
- Image preview URL serving is basic (files aren’t publicly exposed by a CDN)
- Some UI screens still reference earlier API names (see compatibility note)
- No AI anomaly detection/annotation yet (Phases 2–3)
- Maintenance form generation not yet implemented (Phase 4) -->

---

## Troubleshooting

- **CORS**: ensure the frontend `VITE_API_URL` matches the backend origin (e.g., `http://localhost:8080`).  
- **Uploads**: check that the `storage/` directory is writable. The backend stores absolute paths.  
- **DB**: verify Postgres credentials or override via env vars.  
- **Swagger**: visit `/swagger` to confirm controller routes.

---

<!-- ## 📄 License & attribution

© 2025 — Oversight team (EN3350). Educational use only.  
UI concept and brief per the course **Project Outline** in `docs/In21-EN3350-Project Outline.pdf`.

---

## Acknowledgements

Department of Electronic & Telecommunication Engineering (EN) · University of Moratuwa. -->
