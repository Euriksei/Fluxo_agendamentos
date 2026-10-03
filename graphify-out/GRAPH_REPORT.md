# Graph Report - fluxo  (2026-10-03)

## Corpus Check
- 83 files · ~103,189 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .css 1, .ico 1)

## Summary
- 345 nodes · 1020 edges · 16 communities (9 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.85)
- Token cost: 182,935 input · 0 output

## Community Hubs (Navigation)
- Backend Infrastructure
- Frontend Application
- Build & Config
- State Management & Hooks
- Landing Page & Auth
- Asaas Payment Service
- TypeScript Config
- Admin Layout
- Backend Dependencies
- Product Architecture
- Dashboard Screenshot
- Default Profile Image
- Logo Image
- PWA Icon

## God Nodes (most connected - your core abstractions)
1. `react` - 46 edges
2. `Button()` - 37 edges
3. `useApi()` - 29 edges
4. `lucide-react` - 28 edges
5. `Input()` - 27 edges
6. `useAuth()` - 26 edges
7. `formatarMoeda()` - 25 edges
8. `AsaasService` - 20 edges
9. `App()` - 18 edges
10. `formatarData()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `LandingPage()`  [EXTRACTED]
  App.tsx → components/Landing Page/LandingPage.tsx
- `App()` --calls--> `NotificationToast()`  [EXTRACTED]
  App.tsx → components/NotificationToast.tsx
- `App()` --calls--> `ProtectedRoute()`  [EXTRACTED]
  App.tsx → components/ProtectedRoute.tsx
- `App()` --calls--> `Login()`  [EXTRACTED]
  App.tsx → pages/Login.tsx
- `App()` --calls--> `Register()`  [EXTRACTED]
  App.tsx → pages/Register.tsx

## Import Cycles
- 2-file cycle: `contexts/SubscriptionContext.jsx -> contexts/index.jsx -> contexts/SubscriptionContext.jsx`

## Hyperedges (group relationships)
- **Fluxo Core Value Proposition Pillars** — fluxo_sistema, fluxo_agenda, fluxo_financeiro, fluxo_fidelizacao [EXTRACTED 1.00]

## Communities (16 total, 7 thin omitted)

### Community 0 - "Backend Infrastructure"
Cohesion: 0.07
Nodes (53): app, __dirname, __filename, frontendPath, limiter, loginLimiter, pool, authenticateToken() (+45 more)

### Community 1 - "Frontend Application"
Cohesion: 0.11
Nodes (55): App(), Button(), ButtonProps, Input(), InputProps, Select(), SelectProps, TextArea() (+47 more)

### Community 2 - "Build & Config"
Cohesion: 0.05
Nodes (38): root, rootElement, dependencies, lucide-react, qrcode, react, react-dom, react-router-dom (+30 more)

### Community 3 - "State Management & Hooks"
Cohesion: 0.12
Nodes (29): formatarMoeda(), PLAN_ICONS, UpgradeModal(), AgendasContext, AgendasProvider(), AppointmentsContext, AppointmentsProvider(), AuthProvider() (+21 more)

### Community 4 - "Landing Page & Auth"
Cohesion: 0.14
Nodes (21): FAQ(), FAQItem(), Features(), Footer(), Hero(), HowItWorks(), LandingPage(), Navbar() (+13 more)

### Community 6 - "TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+8 more)

### Community 7 - "Admin Layout"
Cohesion: 0.24
Nodes (10): Layout(), Layout(), NavLink(), NavLinkProps, ProtectedRoute(), AuthContext, useAuth(), STATUS_COLORS (+2 more)

### Community 8 - "Backend Dependencies"
Cohesion: 0.20
Nodes (10): dependencies, bcrypt, cors, dotenv, express, express-rate-limit, helmet, jsonwebtoken (+2 more)

### Community 9 - "Product Architecture"
Cohesion: 0.33
Nodes (6): Agenda (Schedule Management), Fidelização (Customer Loyalty), Financeiro (Financial Control), Fluxo Barbershop Management System, Fluxo Entry Point (index.html), Fluxo Application Entry Module (index.tsx)

## Knowledge Gaps
- **104 isolated node(s):** `__filename`, `__dirname`, `app`, `limiter`, `loginLimiter` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 115 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Landing Page & Auth` to `Frontend Application`, `Build & Config`, `State Management & Hooks`, `Admin Layout`?**
  _High betweenness centrality (0.293) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Landing Page & Auth` to `Frontend Application`, `Build & Config`, `State Management & Hooks`, `Admin Layout`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `app` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Infrastructure` be split into smaller, more focused modules?**
  _Cohesion score 0.07006151742993848 - nodes in this community are weakly interconnected._
- **Should `Frontend Application` be split into smaller, more focused modules?**
  _Cohesion score 0.110990990990991 - nodes in this community are weakly interconnected._
- **Should `Build & Config` be split into smaller, more focused modules?**
  _Cohesion score 0.05110336817653891 - nodes in this community are weakly interconnected._
- **Should `State Management & Hooks` be split into smaller, more focused modules?**
  _Cohesion score 0.11923076923076924 - nodes in this community are weakly interconnected._