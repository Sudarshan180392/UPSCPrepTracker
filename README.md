# 🎯 UPSC/SPSC PrepSheet — 30-Day Tracker
 
A full-featured, offline-first React web app for UPSC Prelims preparation. Track daily study hours, mock tests, current affairs, and personal wellbeing — all stored locally in your browser. No account, no server, no data leaving your device.
 
---
 
## ✨ Features
 
### 🏠 Dashboard
- 6 live KPI cards — total hours, study days, overall progress, mocks done, mock average, CA topics
- Donut chart showing subject-wise split
- 30-day study heatmap
- Streak counter (consecutive study days)
- Days left to exam countdown
- One-click Copy Summary to clipboard
### 📅 Day Sheet (Days 1–30)
- Day navigator to jump between any of the 30 days
- Per-subject hours input with live progress bars and status badges
- Dynamic task list — add/remove rows, set priority, mark done
- Per-row stopwatch to time individual tasks
- Color-coded rows (green = done, red = overdue)
- Wellbeing section — mood (1–5 stars), sleep hours, newspaper read toggle
- Daily reflections text area
### 📊 Period Summary
- Consolidated hours vs target across the full period
- Subject-wise gap analysis
- Best day / worst day highlights
- Weak areas table with action plan and resolved checkbox
### 📝 Mock Analysis
- Mock test log with score, max marks, auto-calculated percentage and percentile
- Score trend line chart across all mocks
- Accuracy pie chart (correct / incorrect / unattempted)
- Subject-wise weakness analysis table
- New concepts & facts log
- Add / remove mock entries dynamically
### 📰 Current Affairs Log
- Up to 60 CA entries with date, topic, category, source, prelims link
- Category filter chips for quick browsing
- Search bar to find any topic instantly
- Revised toggle per entry
- Mark All Revised button
### ⚙️ Settings
- Set your exam date (drives the countdown)
- Rename the study period
- Add or remove subjects
- Toggle wellbeing section on/off
### 💾 Data & Export
- Export full data as JSON (backup)
- Import JSON to restore data on any device
- Export summary as PDF
- Copy summary to clipboard
- Reset all data with confirmation modal
---
 
## 🛠 Tech Stack
 
| Layer | Technology |
|---|---|
| Framework | React 18 |
| Routing | React Router v6 |
| State / Persistence | Zustand + `persist` middleware → localStorage |
| Charts | Recharts |
| Icons | Lucide React |
| Build Tool | Vite |
| Styling | Plain CSS with CSS variables (no Tailwind, no UI library) |
| Fonts | Space Grotesk (display) + Inter (body) + JetBrains Mono (data) |
 
---
 
## 📁 Project Structure
 
```
upsc-tracker/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx                  # React entry point
    ├── App.jsx                   # Router + layout shell
    ├── index.css                 # Global design system (CSS variables, responsive)
    │
    ├── pages/
    │   ├── Dashboard.jsx         # Auto-computed KPI view
    │   ├── DayTracker.jsx        # Day 1–30 daily sheet
    │   ├── PeriodSummary.jsx     # Consolidated period view
    │   ├── MockAnalysis.jsx      # Mock test log + charts
    │   ├── CurrentAffairs.jsx    # CA log with search + filter
    │   └── NotFound.jsx          # 404 fallback
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Topnav.jsx        # Top navigation bar
    │   │   ├── Sidebar.jsx       # Desktop sidebar with all routes
    │   │   └── BottomNav.jsx     # Mobile bottom navigation
    │   ├── dashboard/
    │   │   ├── KpiCard.jsx       # Individual KPI tile
    │   │   └── SubjectTable.jsx  # Subject progress rows
    │   ├── day/
    │   │   ├── HoursTable.jsx    # Target vs studied per subject
    │   │   └── TaskList.jsx      # Task rows with stopwatch
    │   └── common/
    │       ├── ProgressBar.jsx   # Colour-coded progress bar
    │       └── StatusBadge.jsx   # ⬜🔴🟡✅ status pill
    │
    ├── store/
    │   └── useStore.js           # Zustand store — all state + localStorage
    │
    └── utils/
        ├── constants.js          # Subjects, targets, categories, priorities
        └── calculations.js       # Progress %, gap, averages, formatting
```
 
---

 
## 📱 Responsive Design
 
| Screen | Layout |
|---|---|
| Desktop (> 1024px) | Fixed sidebar + content area |
| Tablet (768–1024px) | Collapsible sidebar via hamburger |
| Mobile (< 768px) | No sidebar — bottom navigation bar with 6 quick tabs |
 
All tables are horizontally scrollable on small screens. All charts reflow with `ResponsiveContainer`.
 
---
 
## 💾 Data Storage
 
All your data is stored in your browser's `localStorage` under the key `upsc-tracker-v1`. This means:
 
- ✅ Works completely offline after first load
- ✅ No account or login required
- ✅ Your data never leaves your device
- ⚠️ Clearing browser data / cache will erase it — use the **Export JSON** feature regularly as a backup
- ⚠️ Data does not sync across devices — use Export → Import to move data
### Backup & Restore
 
1. Go to **Settings → Export JSON** — saves a `.json` file to your downloads
2. On another device or after reinstall, go to **Settings → Import JSON** and select that file
3. All your data is restored instantly
---
 
## 📖 How to Use
 
### First Time Setup
1. Go to **Settings**
2. Set your **exam date** — this powers the countdown on the dashboard
3. Optionally rename the study period and add/remove subjects
### Daily Workflow
1. Open **Day Sheet** for today's day number
2. Fill in hours studied per subject as you go (or at end of day)
3. Add tasks in the **Tasks** tab with priorities
4. Tick tasks as done — use the per-row stopwatch if needed
5. Fill in **Wellbeing** — mood, sleep, newspaper
6. Write your **Reflections** — what went well, what to revise
### Mocks
1. Go to **Mock Analysis**
2. Add a row for each mock with score and max marks
3. The app auto-calculates your percentage and percentile
4. Trend charts update automatically
### Current Affairs
1. Go to **Current Affairs Log**
2. Add topics as you read them with category and source
3. Use the search bar and filter chips to revise quickly
4. Tick "Revised" when done
---
 
## 🗺 Subjects Tracked
 
| Subject | 

| History – Ancient | 
| History – Medieval | 
| History – Modern | 
| Polity | 
| Economy | 
| Geography – India | 
| Geography – World | 
| Environment | 
| Science & Tech | 
| Current Affairs |
| CSAT | 
| Revision | 
 
Targets can be customised per subject in **Settings**.
 
---
 
## 🙌 Credits
 
Designed and built by an ex-UPSC aspirant. A full React web app for better usability across devices.
 
---
 
## 📄 License
 
---
> Best of luck with your preparation. 🇮🇳
