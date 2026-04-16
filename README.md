# Burbank Library & Civic Center — Cost Model

**180 line items · 28 categories · 3-point estimates · Scenario comparison**

A real-time construction cost management application for the Burbank Central Library & Civic Center project. Built for preconstruction teams using PCL brand guidelines.

## Project Parameters

| Component | Size | Budget Target |
|-----------|------|---------------|
| Building (Library + City Office) | 97,500 SF | $108.5M |
| Parking Structure | 310 stalls | $20.6M |
| Open Space | 43,000 SF | $25.9M |
| **Design-Build Contract** | | **$155M** |
| Owner Soft Costs | | $30-35M |
| **Total Project** | | **$185-190M** |

Pricing basis: Burbank CA, prevailing wage, SoCal region factor 1.15, 4% escalation to midpoint of construction (2028).

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Deploy to GitHub Pages

```bash
npm run deploy
```

This builds the project and pushes to the `gh-pages` branch. Make sure to update the `base` path in `vite.config.js` to match your repository name.

## Project Structure

```
src/
├── main.jsx                    ← Entry point
├── App.jsx                     ← Shell, routing, scenario management
│
├── engine/
│   └── CostEngine.js           ← All cost formulas (pure functions)
│
├── data/
│   ├── seedData.js              ← 180 line items with quantities & costs
│   ├── defaults.js              ← Default assumptions (escalation, tax, etc.)
│   └── constants.js             ← PCL brand colors, fonts, scenario types
│
├── hooks/
│   ├── useWindowSize.js         ← Responsive breakpoint detection
│   └── useScenarios.js          ← Scenario CRUD + audit log state
│
├── components/
│   ├── Dashboard.jsx            ← KPIs, category bars, top drivers
│   ├── CostModel.jsx            ← Table (desktop) / cards (mobile)
│   ├── Compare.jsx              ← Side-by-side scenario comparison
│   ├── Assumptions.jsx          ← Global parameters + impact preview
│   ├── AuditLog.jsx             ← Change history with undo
│   ├── EditField.jsx            ← Inline editable cell (touch-friendly)
│   └── Badge.jsx                ← Sensitivity indicator
│
└── utils/
    └── format.js                ← Currency, $/SF, percentage formatters
```

## How to Modify

### Change a cost formula

Edit `src/engine/CostEngine.js`. All formulas are pure functions with no dependencies. The calculation order is:

```
Line item: qtyAvg × unitCostMid = midTotal
Project:   Σ(line items) × escalation × regionFactor = subtotal
           + contingency + GC + fee + insurance + bond + tax = total
```

### Add a line item

Add a row to the `RAW` array in `src/data/seedData.js`:

```js
["Category", "Subcategory", "Description", qtyMin, qtyMax, "unit",
 costLow, costMid, costHigh, "basis", "sensitivity", "notes"],
```

### Change global assumptions

Edit `src/data/defaults.js`. All percentages are stored as decimals (0.05 = 5%).

### Change brand colors

Edit `src/data/constants.js`. All PCL brand colors are defined in the `COLORS` object.

### Add a new view/tab

1. Create a component in `src/components/`
2. Add it to the `tabs` array and the render switch in `src/App.jsx`

## Next Steps

- **Persistence**: Add Supabase for database storage
- **Authentication**: Add NextAuth or Supabase Auth for user login
- **AI Features**: Add Claude API for cost advisor and variance explanations
- **PDF Export**: Add print-friendly report generation
- **Real-time sync**: Add WebSocket for multi-user collaboration

## Tech Stack

- **React 18** — UI framework
- **Vite** — Build tool and dev server
- **Barlow / Barlow Condensed** — PCL brand typography (Google Fonts)
- No CSS framework — inline styles for zero-config deployment
