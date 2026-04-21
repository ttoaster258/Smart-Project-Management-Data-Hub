# Smart Project Management Data Hub

> **Enterprise-grade project management dashboard built with modern web technologies.**  
> A comprehensive solution for executive decision-making, project tracking, and team performance analytics.

---

## 📊 Project Overview

This is a full-stack **Project Management Data Center** designed for enterprise executive teams and PMO (Project Management Office) operations. The system provides real-time visibility into project portfolios, resource allocation, financial metrics, and risk assessment across multiple business regions.

### Key Highlights

- **30x Efficiency Improvement**: AI-augmented development workflow enabled solo development of 30,000+ lines of production code
- **Full-Stack Architecture**: React frontend + Express backend + SQLite database with automatic migrations
- **Role-Based Access Control**: Enterprise-grade RBAC system with granular permission management
- **AI-Powered Reporting**: Intelligent weekly/monthly report generation using AI APIs

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18.2** | Core UI framework with functional components |
| **Vite 6** | Fast build tool with ESM-first architecture |
| **Tailwind CSS 4** | Utility-first styling (CDN integration) |
| **Recharts 2.13** | Data visualization charts (Bar, Pie, Line) |
| **React Router 6** | Client-side routing with nested navigation |
| **TypeScript** | Type safety across frontend codebase |

### Backend
| Technology | Purpose |
|------------|---------|
| **Express.js** | RESTful API server with middleware pipeline |
| **SQLite (sql.js)** | Zero-dependency database with auto-migrations |
| **JWT Authentication** | Secure token-based user authentication |
| **Custom RBAC** | Role/Permission/Data-scope authorization system |

### Build & Development
- **ESM Module System**: Modern import/export syntax throughout
- **Vite Proxy**: Development API requests proxied to Express backend
- **Concurrently**: Parallel frontend/backend development servers

---

## 💼 Business Value

### Executive Decision Support
The dashboard transforms raw project data into actionable insights:

| Feature | Business Impact |
|---------|-----------------|
| **KPI Dashboard** | Real-time revenue, contract, and milestone tracking |
| **Risk Early Warning** | 3-tier risk detection (schedule, cost, quality) |
| **Regional Analytics** | Geographic performance comparison with drill-down |
| **Acceptance Tracking** | Revenue confirmation pipeline management |

### Quantifiable Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Report Generation | 4 hours | 15 minutes | **16x faster** |
| Data Query Response | 2 days | Real-time | **Instant access** |
| Risk Detection | Manual review | Automatic alerts | **Proactive management** |
| Cross-region Analysis | Weekly compilation | Live dashboard | **Continuous visibility** |

---

## ⭐ Core Features

### 1. Role-Based Access Control (RBAC)

A comprehensive permission system supporting:
- **Roles**: Admin, PMO, Regional Director, Project Manager
- **Permissions**: 40+ granular permission codes
- **Data Scope**: All projects / Region-specific / Personal projects only
- **Navigation Filtering**: Dynamic menu based on user permissions

```typescript
// Permission-driven navigation filtering
const NAV_PERMISSION_MAP: Record<string, string[]> = {
  'Business_Data': ['dashboard:business'],
  'Regional_Dashboard': ['dashboard:regional', 'dashboard:regional_own'],
  'PMO_Project_Management': ['dashboard:pmo', 'dashboard:pmo_progress'],
  ...
};
```

### 2. AI-Powered Report Generation

Intelligent report system with:
- **Report Types**: Weekly status reports, Monthly performance reviews
- **Scope Options**: Global, Regional, Personal (Project Manager)
- **Export Formats**: Markdown preview → Word/PDF export
- **AI Integration**: Claude/Anthropic API for content synthesis

```typescript
// Report generation with structured prompts
const generateReport = async (reportType, scope, dateRange) => {
  // Aggregate project metrics
  // Generate AI-powered narrative
  // Export to professional documents
};
```

### 3. Milestone Tracking System

Swimlane visualization for project lifecycle:
- **13 Milestone Nodes**: From early quote to acceptance
- **5 Key Nodes**: Critical checkpoints for quality risk detection
- **Visual Status**: Completed / Processing / Pending / Delayed
- **Drill-down Modal**: Project detail with milestone timeline

### 4. Risk Early Warning

Triple-layer risk identification:

| Risk Type | Detection Criteria |
|-----------|-------------------|
| **Schedule Risk** | Delay ≥1 month OR Status = "Paused" |
| **Cost Risk** | Margin rate <0% OR Budget overrun OR Man-hour deviation >20% |
| **Quality Risk** | Key milestone missing OR Milestone overdue >30 days |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (ESM support required)
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/smart-pm-dashboard.git

# Install dependencies
npm install

# Configure environment (optional)
cp .env.example .env
# Edit .env with your settings
```

### Development

```bash
# Start frontend + backend together
npm run dev:all

# Or run separately:
npm run dev      # Frontend (Port 8080)
npm run server   # Backend (Port 4000)
```

### Production

```bash
# Build frontend
npm run build

# Start backend server
npm run start

# Serve frontend from dist/
# Configure reverse proxy to /api → backend:4000
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Backend server port |
| `VITE_API_URL` | http://localhost:4000 | API base URL for frontend |
| `JWT_SECRET` | *required* | JWT signing secret |
| `ANTHROPIC_API_KEY` | *optional* | AI report generation |

---

## 📁 Project Structure

```
├── App.tsx                    # Main entry with routing
├── types.ts                   # TypeScript interfaces
├── constants.tsx              # Business logic constants
├── config/
│   └── api.config.ts          # Centralized API URL configuration
├── services/
│   ├── ProjectDataService.ts  # Project CRUD operations
│   ├── AuthService.ts         # JWT authentication
│   └── ProductService.ts      # Product sales tracking
├── components/
│   ├── DecisionDashboard.tsx  # Executive KPI dashboard
│   ├── ProgressMonitorPage.tsx # Milestone swimlane view
│   ├── RiskWarningPage.tsx    # Risk early warning
│   ├── ReportGeneratorPage.tsx # AI report generation
│   └── acceptance-tracking/   # Acceptance tracking module
├── server/
│   ├── index.js               # Express entry point
│   ├── db.js                  # SQLite database manager
│   ├── routes/                # API route definitions
│   ├── services/              # Backend business logic
│   ├── middleware/            # Auth middleware
│   └── migrations/            # Database schema migrations
└── scripts/                   # Utility scripts
```

---

## 🔒 Security Features

- **JWT Authentication**: Secure token-based session management
- **Password Encryption**: bcrypt hashing for user credentials
- **Admin IP Whitelist**: Restricted admin access to authorized IPs
- **Rate Limiting**: Request throttling (500 requests per 15 minutes)
- **SQL Injection Prevention**: Parameterized queries throughout
- **XSS Protection**: Input sanitization on all forms

---

## 📈 Database Schema

Automatic migrations create the following tables:

| Table | Purpose |
|-------|---------|
| `projects` | Core project information (60+ fields) |
| `users` | User accounts with credentials |
| `roles` | Role definitions |
| `permissions` | Permission registry |
| `user_roles` | User-role assignments |
| `role_permissions` | Role-permission mappings |
| `project_changes` | Change history tracking |
| `milestones` | Project milestone data |
| `custom_columns` | Dynamic column definitions |

---

## 🧪 AI-Augmented Development Workflow

This project demonstrates modern **"Vibe Coding"** methodology:

### Development Statistics
- **Total Lines**: ~30,000 (frontend + backend)
- **Development Time**: Accelerated through AI assistance
- **Components**: 40+ React components
- **API Endpoints**: 50+ REST routes

### Workflow Characteristics
- AI-assisted code generation with iterative refinement
- Real-time debugging and optimization suggestions
- Automated documentation generation
- Continuous architecture review

---

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

This is a portfolio demonstration project. For questions or feedback, please open an issue in the repository.

---

## 📸 Screenshots

> Key dashboard views demonstrating the system capabilities

| Dashboard | Description |
|-----------|-------------|
| Executive KPI | Revenue, contracts, and milestone summary |
| Regional View | Geographic performance drill-down |
| Milestone Swimlane | Project lifecycle visualization |
| Risk Warning | Triple-layer risk identification |
| Acceptance Tracking | Revenue confirmation pipeline |

---

**Built with ❤️ using AI-Augmented Development Workflow (Vibe Coding)**"# Smart-Project-Management-Data-Hub" 
