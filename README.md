# Praxio AI Admin Dashboard

Admin dashboard for Praxio AI Tax Assistant - an AI-powered Australian tax assistant platform.

## Overview

This is the administrative interface for managing users, chats, analytics, and subscriptions for the Praxio AI platform. The dashboard provides comprehensive tools for monitoring user activity, managing conversations, and handling subscription workflows.

## Tech Stack

- **Framework**: Next.js 16.0.7 (App Router)
- **React**: 19.2.1
- **TypeScript**: 5.9.3
- **Authentication**: Firebase Auth
- **Database**: 
  - Firebase Firestore (user data, chats)
  - Supabase (analytics, chat storage)
- **Payments**: Stripe (subscriptions)
- **UI Components**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- Firebase project with Firestore enabled
- Supabase project
- Stripe account (for production)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd praxio-admin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure environment variables in `.env.local`:
```env
# Firebase
NEXT_PUBLIC_FB_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FB_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FB_PROJECT_ID=your_firebase_project_id

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=price_monthly_id
NEXT_PUBLIC_STRIPE_PRICE_YEARLY=price_yearly_id
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
praxio-admin/
├── app/
│   ├── (auth)/          # Authentication routes (signin, signup)
│   ├── (protected)/     # Protected admin routes
│   │   ├── admin/       # Main admin dashboard
│   │   ├── users/       # User management
│   │   ├── chats/       # Chat management
│   │   ├── praxio/      # Praxio chat interface
│   │   ├── pricing/     # Subscription pricing page
│   │   └── settings/    # Settings page
│   ├── api/             # API routes
│   │   ├── stripe/      # Stripe integration endpoints
│   │   ├── chats/       # Chat export endpoints
│   │   └── users/       # User management endpoints
│   └── actions.ts       # Server actions
├── components/          # React components
│   ├── ui/              # shadcn/ui components
│   └── ...              # Custom components
├── lib/                 # Utility libraries
│   ├── firebase.ts      # Firebase configuration
│   ├── supabase.ts      # Supabase configuration
│   ├── types.ts         # TypeScript types
│   └── utils.ts         # Utility functions
├── docs/                # Documentation
│   └── PRICING_UX_REVIEW.md
└── public/              # Static assets
```

## Key Features

### Admin Dashboard
- **Analytics & KPIs**: View key metrics, user statistics, and chat analytics
- **User Management**: Manage users, verify emails, view subscription status
- **Chat Management**: View, search, and export chat conversations
- **Export Functionality**: Export chats as PDF or DOCX
- **Filtering & Search**: Advanced filtering by date range, email, status, and more

### Authentication
- Firebase Authentication integration
- Protected routes with role-based access
- Admin-only access control

### Subscription Management
- Stripe integration for subscription handling
- Trial period management
- Pricing page with monthly/yearly plans
- Checkout session creation and management

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

See `STRIPE_SETUP.md` for detailed environment variable setup instructions.

### Required Environment Variables

**Firebase:**
- `NEXT_PUBLIC_FB_API_KEY`
- `NEXT_PUBLIC_FB_AUTH_DOMAIN`
- `NEXT_PUBLIC_FB_PROJECT_ID`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Stripe:**
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY`
- `NEXT_PUBLIC_STRIPE_PRICE_YEARLY`

## Deployment

This project is configured for deployment on Vercel.

1. Push your code to your Git repository
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

For detailed Stripe setup instructions, see `STRIPE_SETUP.md`.

## Documentation

- `STRIPE_SETUP.md` - Stripe integration and environment variable setup
- `PRICING_IMPLEMENTATION_GUIDE.md` - Pricing page implementation details
- `docs/PRICING_UX_REVIEW.md` - UX analysis and recommendations

## Security Notes

⚠️ **Important Security Practices:**
- Never commit `.env.local` or environment variables to version control
- Use environment variables for all sensitive data
- Keep Firebase Admin private keys secure
- Use Stripe test keys for development
- Regularly rotate API keys and secrets

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Private - All rights reserved

## Support

For issues or questions, please contact the development team.
