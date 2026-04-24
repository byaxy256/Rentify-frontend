# Rentify - Property Management System

A comprehensive rental property management system built with React, TypeScript, and Supabase.

## Project Structure

```
rentify/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── app/          # Main application code
│   │   └── styles/       # CSS and styling
│   ├── utils/            # Frontend utilities
│   └── README.md         # Frontend documentation
│
├── backend/              # Backend templates (reference only - NOT deployed)
│   ├── api/              # API handler templates
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility templates
│   └── README.md         # Backend documentation
│
├── supabase/             # Supabase Edge Functions (ACTUAL DEPLOYED CODE)
│   └── functions/
│       └── server/       # HTTP server
│           ├── api/      # Deployed API handlers
│           ├── utils/    # Deployed utilities
│           ├── types/    # Deployed types
│           ├── index.tsx # Main server entry point
│           └── kv_store.tsx # Auto-generated KV store
│
├── supabase-schema.sql   # Database schema
├── BACKEND_SETUP.md      # Backend setup guide
├── LOGIN_CREDENTIALS.md  # Login credentials for testing
└── README.md             # This file
```

## Features

### For Landlords
- 🏢 **Building Management** - Manage multiple properties, floors, and units
- 👥 **Tenant Management** - Track tenant information, leases, and assignments
- 💰 **Payment Tracking** - Monitor rent payments and payment history
- 📋 **Bill Management** - Manage utility bills (water, electricity, rubbish, URA)
- 🔧 **Maintenance Requests** - Receive and respond to tenant requests
- 💬 **Messaging** - Direct communication with tenants
- 📄 **Documents & Leases** - Store and manage lease agreements and documents
- 📊 **Expense Tracking** - Track property expenses and generate reports
- 🔔 **Payment Reminders** - Automated reminder system
- 📈 **Analytics & Reports** - Dashboard with charts and export capabilities

### For Tenants
- 💳 **Rent Payment** - Pay rent via MTN Money, Airtel Money, or Bank Transfer
- 💡 **Utility Bills** - View and pay utility bills
- 📡 **WiFi Billing** - Subscribe to WiFi plans (daily/weekly/monthly)
- 📜 **Payment History** - View all past payments
- 🔧 **Maintenance Requests** - Submit and track requests
- 💬 **Messaging** - Direct communication with landlord
- 📋 **Lease Agreement** - Digital lease with mandatory acceptance
- 📱 **Notifications** - Push notifications for messages and updates

### For Admins
- 🎛️ **System Overview** - View all properties and users
- 👨‍💼 **User Management** - Manage landlords and tenants
- 📊 **System Reports** - Generate system-wide reports

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Vite** - Build tool
- **Recharts** - Charts and visualizations
- **Lucide React** - Icons
- **Motion** (Framer Motion) - Animations
- **Sonner** - Toast notifications

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
  - Real-time subscriptions
  - File storage
  - Edge Functions (Deno runtime)
- **Hono** - HTTP server framework
- **TypeScript** - Type safety

## Getting Started

### Prerequisites
- Figma Make account
- Supabase account (for production)

### Local Environment Variables

For local Vite runs, copy the example env file and set your Supabase values:

```bash
cp .env.example .env
```

Required variables:
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_APP_URL` (recommended for password reset emails, e.g. `https://your-domain.com`)

### Development (Without Backend)

The app works with mock data stored in localStorage:

1. Open in Figma Make
2. Start developing - all data is stored in browser localStorage
3. Login with test credentials:
   - Admin: `admin@rentify.com` / `admin123`
   - Landlord: `landlord@test.com` / `password123`
   - Tenant: `tenant@test.com` / `password123`

### Production (With Backend)

To connect to Supabase for persistent data:

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Connect in Figma Make**
   - Open Make settings (⚙️ icon)
   - Click "Connect Supabase"
   - Enter your Supabase credentials

3. **Set Up Database**
   - Go to Supabase SQL Editor
   - Run the SQL in `supabase-schema.sql`

4. **Done!**
   - Frontend automatically detects backend connection
   - All data now stored in Supabase instead of localStorage

See [BACKEND_SETUP.md](./BACKEND_SETUP.md) for detailed instructions.

## Architecture

⚠️ **Important**: The `/backend/` folder is for **reference/templates only**. The actual deployed backend code lives in `/supabase/functions/server/` because Supabase Edge Functions can only access files within their own directory.

### Data Flow

#### Without Backend (Development)
```
Frontend → localStorage
```

#### With Backend (Production)
```
Frontend → HTTP API → Supabase Edge Functions → PostgreSQL
                       (/supabase/functions/server/)
```

### Authentication Flow

1. User logs in via `LoginForm`
2. Frontend calls `/auth/login` endpoint
3. Backend validates credentials with Supabase Auth
4. Backend returns user info + JWT token
5. Frontend stores token in localStorage
6. All subsequent requests include token in Authorization header

### Real-time Features

When backend is connected:
- **Messages** - Real-time sync using Supabase Realtime
- **Payment Updates** - Instant notifications when payments are made
- **Maintenance Requests** - Live status updates

## Database Schema

See `supabase-schema.sql` for complete database schema including:

- `profiles` - User accounts and roles
- `buildings` - Property buildings
- `floors` - Floors within buildings
- `units` - Individual rental units
- `tenant_details` - Extended tenant information
- `payments` - Rent and bill payments
- `bills` - Utility and tax bills
- `tenant_requests` - Maintenance requests
- `messages` - Chat messages
- `expenses` - Property expenses
- `documents` - Document metadata
- `wifi_subscriptions` - WiFi billing data

## API Endpoints

All endpoints are prefixed with `/make-server-28aab74c/`

### Authentication
- `POST /auth/login` - User login
- `POST /auth/signup` - Create account
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Buildings
- `GET /buildings` - List buildings
- `GET /buildings/:id` - Get building details
- `POST /buildings` - Create building
- `PUT /buildings/:id` - Update building
- `DELETE /buildings/:id` - Delete building

See [backend/README.md](./backend/README.md) for complete API documentation.

## Security

- **Row Level Security (RLS)** - Database-level access control
- **JWT Authentication** - Secure token-based auth
- **HTTPS Only** - All API calls over HTTPS
- **Input Validation** - Server-side validation of all inputs
- **Role-based Access** - Admin, Landlord, Tenant roles

⚠️ **Note**: Make is not intended for collecting PII or highly sensitive data.

## Deployment

The frontend automatically deploys in Figma Make. The backend deploys to Supabase Edge Functions.

To manually deploy backend changes:
1. Make changes to files in `/supabase/functions/server/` or `/backend/`
2. Supabase automatically redeploys on push (if connected via Make)
3. Or manually deploy from Make settings → "Deploy Edge Functions"

## Testing

### Test Accounts

See [LOGIN_CREDENTIALS.md](./LOGIN_CREDENTIALS.md) for test credentials.

### Manual Testing
1. Login as landlord
2. Create a building
3. Add floors and units
4. Login as tenant (different browser/incognito)
5. Test messaging, payments, requests

## Troubleshooting

### Backend not connected
- Verify Supabase is connected in Make settings
- Check browser console for errors
- Ensure `utils/supabase/info.tsx` exists

### Data not persisting
- If backend not connected, data only persists in localStorage
- Clear localStorage to reset dummy data
- Connect Supabase for permanent storage

### Authentication errors
- Verify user exists in both `auth.users` and `profiles` table
- Check that RLS policies are enabled
- Ensure auth token is valid

## Contributing

This is a Figma Make project. To contribute:
1. Make changes in Figma Make editor
2. Test thoroughly with dummy data
3. Test with backend connected
4. Document any new features

## License

Proprietary - Rentify Property Management System

## Support

For issues or questions:
- Check `BACKEND_SETUP.md` for setup help
- Review `frontend/README.md` and `backend/README.md` for technical docs
- Check browser console for error messages
