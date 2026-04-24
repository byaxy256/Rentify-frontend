# Rentify Backend API

⚠️ **IMPORTANT**: This folder is for **reference only**. 

The actual deployed backend code lives in `/supabase/functions/server/` because Supabase Edge Functions can only access files within the `supabase/functions` directory.

## Structure

```
backend/                          # Reference/Templates (not deployed)
├── api/                          # API route handler templates
├── types/                        # TypeScript type definitions
├── utils/                        # Utility function templates
└── README.md                     # This file

supabase/functions/server/        # ACTUAL DEPLOYED CODE
├── api/                          # Deployed API handlers
│   ├── auth.ts                   # Authentication endpoints
│   └── buildings.ts              # Building endpoints
├── utils/                        # Deployed utilities
│   ├── supabase.ts               # Supabase client
│   └── responses.ts              # Response helpers
├── types/                        # Deployed types
│   └── index.ts                  # Type definitions
├── index.tsx                     # Main HTTP server
└── kv_store.tsx                  # Key-value store (auto-generated)
```

## Adding New API Endpoints

When you add new API endpoints:

1. **Create the handler** in `supabase/functions/server/api/`
   - Example: `supabase/functions/server/api/payments.ts`

2. **Import in server** at `supabase/functions/server/index.tsx`
   ```typescript
   import { handleGetPayments } from "./api/payments.ts";
   ```

3. **Add the route**
   ```typescript
   app.get("/make-server-28aab74c/payments", async (c) => {
     const response = await handleGetPayments(c.req.raw);
     return response;
   });
   ```

4. **(Optional) Copy to backend/** for reference
   - Keep templates in `backend/api/` for documentation
   - But remember: only `supabase/functions/server/` code is deployed!

## API Routes

All routes are prefixed with `/make-server-28aab74c/` (required by Make).

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/signup` - Create new user account

### Buildings
- `GET /buildings` - Get all buildings for current landlord
- `GET /buildings/:id` - Get building details
- `POST /buildings` - Create new building
- `PUT /buildings/:id` - Update building
- `DELETE /buildings/:id` - Delete building

### Tenants
- `GET /tenants` - Get all tenants
- `GET /tenants/:id` - Get tenant details
- `POST /tenants` - Create new tenant
- `PUT /tenants/:id` - Update tenant info

### Payments
- `GET /payments` - Get all payments (filtered by user role)
- `POST /payments` - Record new payment
- `GET /payments/:id` - Get payment details

### Bills
- `GET /bills` - Get all bills
- `POST /bills` - Create new bill
- `PUT /bills/:id` - Update bill status

### Maintenance Requests
- `GET /requests` - Get all maintenance requests
- `POST /requests` - Create new request
- `PUT /requests/:id` - Update request status

### Messages
- `GET /messages/:tenantId` - Get messages for tenant
- `POST /messages` - Send new message
- `PUT /messages/:id/read` - Mark message as read

### WiFi
- `POST /wifi/subscribe` - Create WiFi subscription
- `GET /wifi/subscriptions/:tenantId` - Get active subscriptions

## Database

Uses Supabase PostgreSQL with the schema defined in `/supabase-schema.sql`.

## Environment Variables

Set these in Supabase Edge Function settings:
- `SUPABASE_URL` - Auto-provided by Supabase
- `SUPABASE_ANON_KEY` - Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase
- `MIKROTIK_API_KEY` - For WiFi integration (optional)
- `SMS_API_KEY` - For SMS notifications (optional)

## Development

The server auto-deploys when you make changes in Figma Make. To manually deploy:
1. Go to Make settings
2. Click "Deploy Edge Functions"

## Testing

Test API endpoints using:
```bash
curl https://<project-id>.supabase.co/functions/v1/make-server-28aab74c/buildings \
  -H "Authorization: Bearer <anon-key>"
```
