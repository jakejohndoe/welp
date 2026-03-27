# Welp Project Architecture

## Tech Stack

### Frontend Framework
- **React 18.3.1** - Core UI library
- **TypeScript 5.8.3** - Type safety
- **Vite 5.4.19** - Build tool and dev server
- **React Router DOM 6.30.1** - Client-side routing

### Backend & Database
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication service
  - Storage service
  - Real-time subscriptions
- **Connection**: Requires environment variables:
  - `VITE_PUBLIC_SUPABASE_URL`
  - `VITE_PUBLIC_SUPABASE_ANON_KEY`

### Styling
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Tailwindcss Animate 1.0.7** - Animation utilities
- **PostCSS** - CSS processing
- **Custom CSS variables** - Brand colors and design tokens

### UI Component Library
- **Radix UI** - Unstyled, accessible component primitives
  - Dialog, Dropdown Menu, Toast, Tabs, etc.
- **shadcn/ui** - Component system built on Radix UI
- **Class Variance Authority (CVA)** - Component variant management
- **Lucide React** - Icon library

### State Management
- **React Context API** - For auth state (useAuth hook)
- **TanStack Query 5.83.0** - Server state management
- **Local component state** - useState for UI state

### Additional Libraries
- **Framer Motion 12.23.12** - Animation library
- **html5-qrcode 2.3.8** - QR code scanning
- **react-qr-code 2.0.18** - QR code generation
- **Recharts 2.15.4** - Charts and data visualization
- **Sonner 1.7.4** - Toast notifications
- **date-fns 4.1.0** - Date utilities
- **Resend 6.1.0** - Email service integration

## Project Structure

```
/
├── src/
│   ├── main.tsx                 # Application entry point
│   ├── App.tsx                   # Root component with router
│   ├── index.css                 # Global styles and CSS variables
│   ├── components/
│   │   ├── ui/                  # Reusable UI components
│   │   ├── business/             # Business-specific components
│   │   ├── gamification/        # Gamification features
│   │   ├── landing/             # Landing page sections
│   │   └── settings/            # Settings components
│   ├── pages/
│   │   ├── Index.tsx            # Landing page
│   │   ├── Login.tsx            # Login page
│   │   ├── Signup.tsx           # Signup selection
│   │   ├── SignupCustomer.tsx   # Customer signup
│   │   ├── SignupBusiness.tsx   # Business signup
│   │   ├── CustomerDashboard.tsx
│   │   ├── BusinessDashboard.tsx
│   │   └── [other pages]
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client & helpers
│   │   ├── emailService.ts     # Email integration
│   │   └── utils.ts             # Utility functions
│   └── hooks/
│       └── useAuth.tsx          # Authentication hook
├── public/
│   ├── logos/                   # Logo assets
│   ├── icons/                   # Icon assets
│   └── avatars/                 # Avatar images
├── api/                         # Serverless functions (if any)
├── supabase/                    # Database migrations/config
└── [config files]

```

## Authentication Flow
1. **Supabase Auth** handles user registration and login
2. **useAuth hook** provides auth state throughout app
3. **Profile creation**:
   - Customer profiles in `customer_profiles` table
   - Business profiles in `business_profiles` table
4. **Protected routes** redirect based on auth status

## Database Schema
- **Users** (Supabase Auth)
- **customer_profiles** - Customer user data
- **business_profiles** - Business owner data
- **reviews** - Review data
- **transactions** - Points/rewards transactions
- **user_badges** - Gamification badges

## Build & Deployment
- **Development**: `npm run dev` (Vite dev server)
- **Production Build**: `npm run build`
- **Preview**: `npm run preview`
- **Deployment**: Configured for Vercel deployment
- **Package Manager**: npm/bun

## Environment Configuration
Required environment variables:
```
VITE_PUBLIC_SUPABASE_URL=<your-supabase-url>
VITE_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

## Key Features
1. **Dual User Types**: Customer and Business accounts
2. **Gamification**: Points, badges, levels, XP system
3. **QR Code Integration**: Scanning and generation
4. **Review System**: Customer reviews for businesses
5. **Dashboard Views**: Separate customer and business dashboards
6. **Responsive Design**: Mobile-first approach
7. **Email Integration**: Via Resend API

## API Integration Points
- **Supabase**: All database operations
- **Resend**: Email notifications
- **QR Code**: Client-side scanning/generation

## Performance Optimizations
- Vite for fast HMR and builds
- Code splitting via React Router
- Lazy loading where applicable
- Optimized animations for mobile
- Reduced motion support

## Security Considerations
- Row Level Security (RLS) in Supabase
- Secure authentication flow
- Environment variables for sensitive data
- CORS configuration needed for API calls

## Known Issues
- **Missing .env file**: Causes "Failed to fetch" error
- **Supabase connection**: Requires valid credentials
- **CORS**: May need configuration for local development