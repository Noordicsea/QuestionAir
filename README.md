# Questionair

Async questions and answers for the two of you. Take your time, protect your energy.

## Overview

Questionair is a relationship support tool designed to move long, draining conversations into an async system. It helps you ask, queue, and answer questions on your own time while reducing burnout through guardrails like "heavy" gating, cooldowns, and response budgeting.

## Features

- **Questions with guardrails**: Tag questions as Quick, Medium, or Deep. Mark heavy questions that require opt-in to view.
- **Multiple response types**: Quick reactions, short answers, long-form responses, structured templates, and voice notes.
- **Swipe mode**: Process questions one at a time in a focused, Tinder-like interface.
- **Cooldown system**: Set cooldown periods on questions to prevent overwhelming discussions.
- **Version history**: All questions and responses track their edit history.
- **Push notifications**: Get notified about new questions and responses (with quiet hours support).

## Tech Stack

- **Frontend**: React with React Router, styled with Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: SQLite with better-sqlite3
- **Push**: Web Push API

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Initialize the database with default users
npm run db:init

# Start development server
npm run dev
```

The app will be available at http://localhost:5173

### Default Login

Two accounts are created automatically:

- **User 1**: `user1@questionair.local` / `changeme123`
- **User 2**: `user2@questionair.local` / `changeme123`

**Important**: Change these passwords after first login!

## Project Structure

```
├── server/
│   ├── db/
│   │   ├── schema.sql       # Database schema
│   │   ├── init.js          # Database initialization
│   │   └── connection.js    # Database connection
│   ├── routes/
│   │   ├── auth.js          # Authentication
│   │   ├── questions.js     # Questions CRUD
│   │   ├── responses.js     # Responses CRUD
│   │   ├── templates.js     # Response templates
│   │   ├── swipe.js         # Swipe queue
│   │   ├── push.js          # Push notifications
│   │   └── settings.js      # User settings
│   ├── middleware/
│   │   └── auth.js          # Auth middleware
│   └── index.js             # Express server
├── src/
│   ├── components/          # React components
│   ├── pages/               # Page components
│   ├── context/             # React context providers
│   └── utils/               # Utility functions
├── public/
│   ├── sw.js                # Service worker
│   └── manifest.json        # PWA manifest
└── data/                    # SQLite database & uploads
```

## Built-in Response Templates

1. **Three-Part Response**: What I heard you asking, My answer, What I need to continue
2. **NVC-lite**: Observation, Feeling, Need, Request
3. **Boundary Response**: What I can answer, What I can't, What would help
4. **Talk Live Request**: Why live is better, Available time, Topics to cover

## Environment Variables (Production)

```bash
PORT=3001
NODE_ENV=production
SESSION_SECRET=your-secure-secret-here
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

To generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

## Deployment

```bash
# Build frontend
npm run build

# Start production server
npm start
```

For production, use a reverse proxy like Nginx or Caddy with HTTPS (required for push notifications).

## Design Philosophy

This app is intentionally designed to avoid "vibe coded" aesthetics:

- **Clean typography**: Source Sans 3 for body, Fraunces for headings
- **Warm, muted palette**: Earth tones (sand, sage, ink, rust) instead of neon gradients
- **Consistent spacing**: 4pt system throughout
- **Subtle interactions**: No aggressive hover effects or bouncing animations
- **Functional UI**: Every element serves a purpose

## License

MIT



