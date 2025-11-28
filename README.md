# Automotive AI CRM

A modern, AI-powered CRM system designed specifically for automotive dealerships to manage SMS conversations, track leads through a sales pipeline, and automate customer engagement campaigns.

## 🚗 Overview

Automotive AI CRM helps dealerships streamline their customer communication with intelligent SMS automation, lead management, and analytics. The system uses AI to generate contextual responses and automatically manage customer interactions through predefined campaign sequences.

## ✨ Features

### 📱 SMS Conversations
- Real-time SMS conversation management
- AI-generated message suggestions
- 160-character SMS counter
- Inbound/outbound message tracking
- Conversation search and filtering

### 🎯 Sales Pipeline
- Kanban-style drag-and-drop interface
- 4 pipeline stages: New Contact → Working Lead → Needs A Call → I Accept
- Lead tagging and campaign assignment
- Visual lead management
- Quick lead detail view

### 📊 Analytics Dashboard
- Message volume tracking (sent vs received)
- Conversation status distribution
- Response rate metrics
- Active campaign monitoring
- 7-day historical data visualization

### 🏷️ Tag-Based Campaigns
14 predefined automated campaigns including:
- New Lead Follow-up
- Ghosted Lead Re-engagement
- Appointment Confirmations
- Service Reminders
- Trade-In Inquiries
- Finance Pre-Approval
- And more...

## 🏗️ Architecture

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Shadcn UI
- **Routing**: React Router v6
- **State**: React Hooks
- **Charts**: Recharts
- **Drag & Drop**: @dnd-kit
- **Forms**: React Hook Form + Zod

### Backend (Planned)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage

### Data Layer
- Mock data service with Supabase integration ready
- Easy toggle between mock and production data
- Type-safe API with TypeScript

## 🎨 Design System

**Consumer Genius Brand Colors:**
- Primary (Orange): `#F39C12` - Main CTAs and primary actions
- Secondary (Green): `#00C851` - Secondary CTAs and success states
- Accent (Coral Red): `#E74C3C` - Brand highlights and active states
- Dark Cards: `#2B2B2B` - Metric cards with high contrast

## 📁 Project Structure

```
Kaiden_Arti/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Shadcn UI components
│   │   │   ├── shared/      # Custom shared components
│   │   │   └── layout/      # Layout components
│   │   ├── pages/           # Page components
│   │   ├── lib/             # Utilities and services
│   │   │   ├── mockData.ts  # Mock data for development
│   │   │   └── dataService.ts # Data service abstraction
│   │   └── types/           # TypeScript type definitions
│   ├── public/
│   └── package.json
├── docs/                     # Documentation
│   ├── database-schema-v1.md
│   ├── frontend-architecture.md
│   ├── version-1-scope.md
│   ├── campaigns.md
│   └── DESIGN_UPDATES.md
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Kaiden_Arti
```

2. Install dependencies:
```bash
cd frontend
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials (when ready)
```

4. Start development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## 🗄️ Database Schema

The application uses a 10-table PostgreSQL schema via Supabase:

1. **users** - User accounts and authentication
2. **leads** - Customer lead information
3. **conversations** - SMS conversation threads
4. **messages** - Individual SMS messages
5. **campaigns** - Automated campaign definitions
6. **campaign_messages** - Campaign message templates
7. **campaign_assignments** - Lead-to-campaign assignments
8. **pipeline_stages** - Sales pipeline stage definitions
9. **ai_message_logs** - AI-generated message tracking
10. **system_settings** - Application configuration

See `docs/database-schema-v1.md` for full schema details.

## 📋 Current Status

### ✅ Completed (Version 1.0)
- Frontend UI with all 5 pages
- Mock data layer
- Consumer Genius design system
- Basic functionality
- TypeScript types
- Responsive design

### 🔄 In Progress
- Supabase backend integration
- Authentication system
- Real-time SMS updates
- AI message generation

### 📅 Planned
- Twilio SMS integration
- OpenAI GPT integration
- User role management
- Advanced analytics
- Mobile app

## 🎯 Use Cases

1. **Dealership Sales Team**: Track leads from first contact to sale
2. **Service Department**: Automated appointment reminders and follow-ups
3. **BDC Representatives**: Manage high-volume SMS conversations
4. **Sales Managers**: Monitor team performance and pipeline health

## 🔐 Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_key
VITE_TWILIO_ACCOUNT_SID=your_twilio_sid
VITE_TWILIO_AUTH_TOKEN=your_twilio_token
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is proprietary and confidential.

## 👥 Team

Built for automotive dealerships who want to leverage AI and automation to improve customer engagement and sales efficiency.

## 📞 Support

For questions or support, please open an issue in the GitHub repository.

---

**Note**: Currently using mock data for development. Supabase integration coming soon!
