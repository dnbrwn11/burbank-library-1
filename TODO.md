# CostDeck TODO
## AI-Powered Preconstruction Platform — costdeck.ai

---

## Done
- [x] Supabase database setup (profiles, projects, scenarios, line_items, audit_log, project_members)
- [x] Row-level security policies with infinite recursion fix
- [x] Magic link auth
- [x] Password login + account creation
- [x] Landing page redesign (split screen, marketing + auth)
- [x] Project dashboard (create, view, list, archive)
- [x] AI Project Generator (45 line items via Claude API)
- [x] Template library (8 building types, dynamic based on project input)
- [x] Pre-populate generator with project details already entered
- [x] Dynamic templates based on building type (subtypes with Recommended badge)
- [x] Contextual suggestion chips based on location and building type
- [x] Deploy to costdeck.ai (Vercel + Cloudflare DNS)
- [x] Supabase auth lock error fixed (navigator.locks override)
- [x] All CSI categories displaying in cost model
- [x] Column header alignment fixed
- [x] Add Item / Add Category buttons
- [x] Inline cell editing with Supabase persistence
- [x] Row moving (up/down arrows)
- [x] PCL branding removed, CostDeck brand applied
- [x] Direct cost vs total cost toggle on dashboard
- [x] Percentage-based contingency and overhead items
- [x] Save timeout fix (batched inserts)
- [x] Custom Supabase email templates (CostDeck branded)
- [x] Vercel environment variables configured (Supabase + Anthropic)

---

## In Progress
- [ ] Drag and drop rows and categories (replacing arrows as primary interaction)
- [ ] Scope gap detection (AI scans estimate for missing items and warnings)

---

## Next Up (This Weekend)

### Multi-Call AI Generation (100-200 items)
- First call: Claude returns list of relevant CSI categories with item counts
- One API call per category (10-25 items each), run 3 in parallel
- Progress bar: "Generating Substructure... Shell... Interiors..."
- JSON repair fallback per category
- Target: 100-150 items in 30-60 seconds

### Resend Email Setup
- Sign up at resend.com (free 3K emails/month)
- Add costdeck.ai domain, verify DNS in Cloudflare
- Configure SMTP in Supabase → Settings → Auth → SMTP
- Emails send from hello@costdeck.ai with CostDeck branding

### Tooltips + Help System
- (?) icons next to key terms: $/SF, Sensitivity, Low/Mid/High, Region Factor, Escalation, Contingency, Labor Burden
- First-time user guide: 3-step overlay (create project → generate estimate → edit and export)
- Empty state help text when sections have no data
- Subtle gray icons, dark tooltip on hover, max 200px wide

### Assumptions Tab
- Edit globals: escalation, tax, contingency, fee, region factor, labor burden, bond, insurance, general conditions
- Totals update live as globals change
- Per-scenario globals (each scenario can have different assumptions)

### Scenario Management
- Create new scenarios: Option A, Option B, VE Option alongside Baseline
- Duplicate scenario with all line items
- Switch between scenarios with tabs or dropdown
- Delete scenario (with confirmation)

### Compare Tab
- Side-by-side scenario comparison
- Delta highlighting (green = savings, red = increase)
- Summary row showing total difference between scenarios

---

## Phase 4 — Reports + Export

### PDF Export
- One-click branded summary report
- Sections: totals, $/SF, category breakdown, top drivers, assumptions, scenario comparison
- White-label option (customer's logo) for paid tiers
- Multiple report types: detailed (estimating team), summary (PM), executive one-pager (VP), VE summary (owner)

### Excel Export
- Full line item download as .xlsx
- Category grouping with subtotals
- Formatted with CostDeck branding

### Import
- Excel/CSV import with column mapping
- RSMeans format import (user brings their own data)
- GMP import (upload contractor's estimate, AI auto-maps)

### Versioning + Snapshots
- Freeze point-in-time: "60% DD Estimate — March 15, 2027"
- Compare current to any snapshot with automatic delta report
- Sequential history separate from parallel scenarios

---

## Phase 5 — Collaboration

### Team Invitations + Roles
- Invite by email: Owner / Editor / Viewer roles
- Editors can add/edit line items, Viewers can only see
- Team management, remove members, transfer ownership
- RLS policies already support this via project_members table

### Real-Time Collaboration
- Multiple users on same project simultaneously
- See who's currently viewing (avatar dots in header)
- Supabase Realtime subscriptions for live updates

### Comments + Discussion
- Threaded comments per line item
- @mention teammates with notifications
- Activity feed showing who changed what and when

### Approval Workflows
- Submit for Review → Approved / Return with Comments
- Junior → senior → director flow
- Lock estimate once approved

### Document Attachments
- Attach sub proposals, spec sections, quotes (PDF) per line item
- Supabase Storage
- Preview in-app

---

## Phase 6 — Monetization

### Pricing Tiers
| Tier | Price | Includes |
|------|-------|----------|
| Free | $0 | 1 project, 1 user, unlimited AI on that project, unlimited scenarios, basic export |
| Pro | $99/mo | Unlimited projects, 5 users, unlimited AI, PDF/Excel exports, all reports, integrations |
| Team | $299/mo | Everything unlimited, white-label reports, portfolio dashboard, benchmarks, API |
| Enterprise | $25-50K/yr | White-label platform, SSO, SOC 2, custom domain, dedicated support |

### Upgrade Triggers
- Free → Pro: user wants a second project or to export a report
- Pro → Team: user wants white-label reports, portfolio view, or 5+ users
- Team → Enterprise: needs SSO, compliance, or custom branding

### Implementation
- Stripe Checkout for subscriptions
- Webhook updates user tier in Supabase profiles table
- Feature checks throughout app based on tier
- 14-day Pro trial for new signups
- Don't add paywall until users are asking to pay

---

## Founders Club — Charter Member Program

### Structure
- 10 spots only
- $49/month locked forever (never increases)
- Access to every feature, every tier, forever — never gated out
- "Founding Member" badge on profile
- Direct line to founder for support and feature requests
- Monthly 15-min call to shape the product roadmap
- "Built with input from [company name]" on costdeck.ai about page (optional)

### Implementation
- Add "founder" as a tier value in Supabase profiles table
- Create hidden $49/month Stripe price for founders only
- Founder tier bypasses all feature gates permanently
- Track founder signups — close program at 10

### Pitch Script
"We're taking 10 founding members who get lifetime pricing at half rate, access to everything we ever build, and a direct line to me to shape the product. I'm only offering this to people who will actually use it and give honest feedback."

---

## Referral & Affiliate Program (Post-10 Customers)

### User Referral Program
- Every user gets unique referral link: costdeck.ai/ref/username
- Referrer gets 1 month free credit ($99 value) per paying signup
- New customer gets first month at 50% off ($49)
- Track via referred_by field in Supabase profiles table
- Dashboard showing referral stats

### Affiliate/Partner Program
- For consultants, precon coaches, industry influencers
- 20% recurring commission for life of customer
- Target: cost consultants (RLB, Cumming, Dharam), precon coaches
- Custom partner dashboard showing earnings

### Milestones
- 10 paying customers → launch user referral program
- 25 paying customers → launch affiliate/partner program
- 50 paying customers → automate commission payouts

---

## Phase 7 — AI Intelligence

### Scope Gap Detection (In Progress)
- AI scans full estimate for missing items
- Flags items with unusual costs for the region
- Completeness score 0-100
- "+ Add to Estimate" button for missing items

### AI Audit (Per Line Item)
- Click any line item → Claude says "this looks high/low, typical range is $X-Y"
- Bulk audit: scan all items against market benchmarks
- Outlier dashboard: green (in range), red (high), yellow (low)
- Overall confidence score

### AI Narrative Reports
- Claude writes cost narrative per scenario
- Per-system analysis with benchmark comparisons
- Executive summary with risks and recommendations

### Monte Carlo Probability Analysis
- 10,000 iterations from 3-point estimates
- P10/P50/P80/P90 probability chart
- Sensitivity tornado diagram

### "What If" Natural Language Query
- "What if we switch curtain wall to storefront on east elevation?"
- Claude calculates cross-item impact, shows delta
- "Find Savings" mode: 5-10 VE suggestions ranked by potential

### Historical Benchmarking
- Completed projects feed anonymized benchmark pool
- AI references benchmarks across projects — network effect
- Unit cost sparklines per item across all your projects

---

## Phase 8 — Developer & Financial Analysis Module

### Target Users
- Real estate developers, owner's reps, lenders, public agencies

### Developer Pro Forma
- Total development cost: land + hard costs + soft costs + financing
- Revenue projections: rental income by unit type, lease-up timeline
- NOI, ROI, IRR, cash-on-cash return, equity multiple
- Yield on cost, residual land value calculation
- AI-generated pro forma from cost model

### Feasibility Analysis
- "Should we build this?" scorecard
- Sensitivity: what happens to IRR if costs rise 10% or rents drop 5%
- Break-even occupancy rate
- Compare build vs buy vs renovate

### Lender Package
- Loan-to-cost, loan-to-value, DSCR
- Draw schedule aligned to construction milestones
- Export as lender-ready PDF

### Public Sector / Owner Tools
- Life-cycle cost analysis (construction vs 30-year operating)
- Bond sizing for ballot measures
- Cost per student / bed / seat metrics

---

## Phase 9 — Integrations

### Procore
- Pull: project data, directory, budget
- Push: estimate as budget, CO sync
- Marketplace application (4-8 week approval)

### Autodesk Construction Cloud
- Pull: docs, drawings, BIM data
- Push: cost data to ACC cost module

### Document Upload for AI Generation
- Upload RFP/specs PDF → Claude extracts scope and generates line items
- Upload floor plans → Claude vision extracts takeoff quantities
- Upload existing estimates (Excel) → AI maps to CostDeck schema
- Multiple file upload support

### Other Integrations (build on demand)
- Google Sheets, Slack/Teams, Sage, DocuSign

---

## Phase 10 — CRM + Pursuit Management
- Pipeline board (Kanban): Identified → Evaluating → Go/No-Go → RFP Response → Shortlisted → Interview → Won/Lost
- Contact & company directory
- Relationship mapping
- Activity tracking with follow-up alerts
- Go/No-Go decision support with AI
- RFP/RFQ response tracking
- Interview prep with AI
- Owner/client intelligence
- Pipeline dashboards and reporting
- AI pursuit assistant (upload RFP → auto-extract everything)

---

## Quality of Life Features (Ongoing)
- [ ] Undo/redo
- [ ] Version history (view and restore previous states)
- [ ] Bulk editing (select multiple items, change all at once)
- [ ] Advanced search and filter (by sensitivity, cost threshold, category)
- [ ] Keyboard shortcuts (Tab, Enter, Escape, Ctrl+Z)
- [ ] Copy/paste rows
- [ ] Print-friendly view
- [ ] Dark mode
- [ ] Notes/justification per line item
- [ ] Estimate vs budget warning ("you're 15% over budget")
- [ ] Cost history chart over time
- [ ] Risk register tied to high sensitivity items
- [ ] Alternates/add-alternates tracking
- [ ] Admin settings (configurable picklists per organization)
- [ ] Mobile responsive polish
- [ ] PWA + offline support

---

## Hiring Timeline
| ARR | Hire |
|-----|------|
| $0-50K | Nobody. Just you. |
| $50-100K | Part-time VA for support |
| $100-250K | Customer success/sales hybrid with construction background |
| $250-500K | Junior developer |
| $500K-1M | Second dev or senior industry advisor |

---

## Revenue Milestones
| Month | Target |
|-------|--------|
| 3 | 5-10 free users, validate usage |
| 6 | 10 Pro ($1K/mo), first paying strangers |
| 9 | 30 Pro + 5 Team ($5K/mo), Procore Marketplace live |
| 12 | 50 Pro + 10 Team ($10K/mo) |
| 18 | 100 Pro + 25 Team + 2 Enterprise ($25K/mo) |
| 24 | 200 Pro + 50 Team + 5 Enterprise ($60K/mo) |
| 30 | **$1M ARR** |

---

*CostDeck — Built by a preconstruction professional, for preconstruction professionals.*
*Last updated: April 17, 2026*
