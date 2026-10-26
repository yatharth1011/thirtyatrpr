# thirty@rpr — IIT Ropar B.Tech Portal

The real-time academic timetable, mess menu, exam seating, and cohort schedule engine built for the IIT Ropar B.Tech Batch of 2026–2030.

🌐 **Live Deployment:** [thirtyatrpr.web.app](https://thirtyatrpr.web.app)

---

## 📌 Overview

**thirty@rpr** is a personalized web application and Progressive Web App (PWA) tailored to each student in the batch across all engineering branches:
- **AIDE** (Artificial Intelligence and Data Engineering)
- **CSE** (Computer Science and Engineering)
- **EE** (Electrical Engineering)
- **MCB / MnC** (Mathematics and Computing)
- **EP** (Engineering Physics)
- **ME** (Mechanical Engineering)
- **CE** (Civil Engineering)
- **CH** (Chemical Engineering)
- **MME** (Metallurgical and Materials Engineering)
- **ES** (Engineering Science)
- **DA** (Digital Agriculture)
- **ICDT** (Integrated Circuit Design & Technology)

---

## 🚀 Key Features

- **Personalized Schedule Grid**: Automatically resolves classes, labs (TL101, WP101, PH101, CY101), tutorials (MA101, CY101), electives (HS110, HS111, HS112, HS113, IK101), NSO sports sessions, and Life Skills (LS101) based on roll number, division (D1–D4), and academic group (G1–G12).
- **Life Skills (LS101) Schedule**: Real-time accurate scheduling incorporating official division rosters and batch updates (e.g. AIDE and MnC Monday sessions at the Auditorium).
- **Live Overlays via Firestore**: Immediate display of lecture reschedules, room changes, and class cancellations without requiring full site re-deployments.
- **Branch Representative Tools (`/br`)**: Dedicated interface for verified Branch Reps (BRs) to publish authenticated schedule adjustments for their sections.
- **Spectate & Cohort Engine (`/spectate`)**: Look up room occupancies, free rooms, and merge group availability across multiple students for collaborative study sessions.
- **Exam Seating & Schedule**: Integrates mid-sem and end-sem exam calendars with student-specific seating arrangements (hall, room, seat number).
- **Mess Menu & Timings**: Day-by-day breakfast, lunch, and dinner menus with automatic weekday tracking.
- **Offline PWA Support**: Fast load times with service worker caching (`sw.js`) and mobile install support via `manifest.webmanifest`.

---

## 🛠 Project Structure

```
portal/
├── build/                      # Build pipeline and schedule compilation
│   ├── merge.py                # Core schedule compilation & conflict resolution
│   ├── splice.py               # Template hydration & public bundle generator
│   ├── verify_all.js           # 100+ scenario end-to-end regression test suite
│   ├── engine.js               # Shared scheduling engine
│   ├── extract_ls_oct.py       # Life Skills division extractor
│   ├── sync_course_hubs.py     # Course hub sync utilities
│   └── roster.json             # Batch student directory & metadata
├── public/                     # Production artifacts deployed to Firebase Hosting
│   ├── index.html              # Main student dashboard
│   ├── spectate.html           # Spectate & room engine
│   ├── br/                     # Branch Rep schedule management tools
│   ├── kaizen/                 # Study tracking interface
│   ├── sw.js                   # Service worker
│   └── manifest.webmanifest    # PWA manifest
├── sources/                    # Raw inputs and official documents
│   ├── contributors/           # Student contributor shared schedules (2026* folders)
│   ├── timetables/             # Official institute timetables, academic calendars & handbook
│   └── updates/                # Periodic batch updates (mess, newdata, sep-new, oct-new)
├── backups/                    # Incremental snapshots and backup archives
├── firebase.json               # Firebase Hosting & Firestore configuration
├── firestore.rules             # Firestore security rules
└── firestore.indexes.json      # Firestore indexes
```

---

## 💻 Development & Workflow

### 1. Compile Schedule Data
Combines raw institute timetables, academic calendars, contributor inputs, and rosters into the single source of truth:
```bash
python3 build/merge.py
```

### 2. Splice & Hydrate Web Apps
Injects compiled JSON data, templates, and shared scripts into `public/index.html`, `/spectate`, `/br`, and `/kaizen`:
```bash
python3 build/splice.py
```

### 3. Run Test Suite
Runs the comprehensive regression test suite validating schedule mappings, date overrides, venue allocations, and roles:
```bash
node build/verify_all.js
```

### 4. Deploy to Firebase
Deploy hosting and Firestore security rules to production:
```bash
firebase deploy
```
Or hosting only:
```bash
firebase deploy --only hosting
```

---

## 📄 License

Proprietary — Built with ❤️ for the IIT Ropar B.Tech Batch of 2026–2030.
