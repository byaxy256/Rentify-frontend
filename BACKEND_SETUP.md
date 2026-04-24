# Rentify Backend Setup Guide

## Current State

Right now, Rentify uses **dummy data stored in localStorage**. This means:
- ✅ Works great for testing and development
- ❌ Data disappears when you clear browser cache
- ❌ No real user authentication
- ❌ No data sync across devices
- ❌ Can't handle multiple users simultaneously

## Why Connect Supabase?

Supabase will give you:

1. **Persistent Database** - PostgreSQL database that stores all data permanently
2. **Real Authentication** - Secure login system for landlords, tenants, and admins
3. **Real-time Updates** - Messages and notifications sync instantly
4. **File Storage** - Upload lease agreements, receipts, and documents
5. **Scalability** - Handle hundreds of tenants and buildings
6. **Security** - Row-level security ensures tenants only see their own data

## How to Connect Supabase

### Step 1: Create a Supabase Project (if you haven't already)

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose a name (e.g., "rentify-production")
4. Set a strong database password (save this!)
5. Choose your region (closest to your users)
6. Wait for the project to be created (~2 minutes)

### Step 2: Connect to Figma Make

1. In Figma Make, click the **Settings** icon (⚙️) in the top bar
2. Find the **Supabase** section
3. Click **Connect Supabase**
4. Enter your Supabase project details:
   - **Project URL**: Found in your Supabase project settings
   - **Anon Key**: Found in your Supabase project settings (API tab)
5. Click **Connect**

### Step 3: Set Up Database Schema

Once connected, run the SQL schema:

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase-schema.sql` (in this project)
5. Click **Run** to create all tables and policies

This will create:
- `profiles` - User accounts (landlords, tenants, admins)
- `buildings` - Property buildings
- `floors` - Floors within buildings
- `units` - Individual rental units
- `tenant_details` - Extended tenant information
- `payments` - Rent and bill payments
- `bills` - Utility and tax bills
- `tenant_requests` - Maintenance/service requests
- `messages` - Chat between landlords and tenants
- `expenses` - Property expenses
- `documents` - File storage metadata
- `wifi_subscriptions` - WiFi billing data

### Step 4: Switch to Backend Mode

After connecting Supabase and running the schema:

1. Open `src/app/lib/api.ts`
2. Change line 5 from:
   ```typescript
   const USE_BACKEND = false;
   ```
   to:
   ```typescript
   const USE_BACKEND = true;
   ```
3. Your app will now use Supabase instead of localStorage!

## Data Migration

### Migrating Existing Test Data

If you want to migrate your current localStorage data to Supabase:

1. Open browser console (F12)
2. Run this to export your data:
   ```javascript
   const data = {
     buildings: JSON.parse(localStorage.getItem('buildings') || '[]'),
     payments: JSON.parse(localStorage.getItem('payments') || '[]'),
     bills: JSON.parse(localStorage.getItem('bills') || '[]'),
     tenantRequests: JSON.parse(localStorage.getItem('tenantRequests') || '[]'),
   };
   console.log(JSON.stringify(data, null, 2));
   ```
3. Copy the output
4. Use Supabase dashboard to insert this data manually, or ask me to create a migration script

### Creating User Accounts

Create landlord/tenant accounts in Supabase:

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click **Add User**
3. Enter email and password
4. After creating user, add their role to the `profiles` table:
   ```sql
   insert into profiles (id, email, full_name, role)
   values (
     'user-id-from-auth',
     'landlord@example.com',
     'John Landlord',
     'landlord'
   );
   ```

## File Storage (Optional)

To enable document uploads (leases, receipts, etc.):

1. Go to **Storage** in Supabase dashboard
2. Create a bucket called `documents`
3. Set access policies:
   ```sql
   -- Allow authenticated users to upload
   create policy "Users can upload documents"
   on storage.objects for insert
   with check (bucket_id = 'documents' and auth.role() = 'authenticated');
   
   -- Allow users to view their documents
   create policy "Users can view documents"
   on storage.objects for select
   using (bucket_id = 'documents' and auth.role() = 'authenticated');
   ```

## Real-time Features

Enable real-time for instant message updates:

1. Already configured in the schema! (`alter publication supabase_realtime add table messages`)
2. Messages will sync automatically between landlords and tenants
3. No polling needed - instant updates!

## Security Notes

⚠️ **Important**: Make is not intended for collecting PII or securing highly sensitive data.

For production:
- Use strong passwords for all user accounts
- Enable 2FA for landlords and admins
- Regularly backup your database (Supabase does this automatically)
- Review Row Level Security (RLS) policies in the schema
- Monitor access logs in Supabase dashboard

## API Keys for External Services

If you need to integrate external services (MikroTik WiFi, SMS gateway, etc.):

1. Go to Supabase **Edge Functions** settings
2. Add environment variables/secrets:
   - `MIKROTIK_API_KEY` - for WiFi integration
   - `SMS_API_KEY` - for SMS notifications
   - Any other API keys
3. These are stored securely and never exposed to the client

## Testing the Connection

After setup, test that everything works:

1. ✅ Create a new landlord account
2. ✅ Add a building
3. ✅ Add a floor and units
4. ✅ Create a tenant account
5. ✅ Assign tenant to a unit
6. ✅ Submit a payment
7. ✅ Send a message between landlord and tenant
8. ✅ Create a maintenance request

## Troubleshooting

**"Backend not connected" error:**
- Make sure `USE_BACKEND = true` in `src/app/lib/api.ts`
- Verify Supabase is connected in Make settings
- Check browser console for detailed errors

**Authentication not working:**
- Ensure users exist in both `auth.users` and `profiles` table
- Check that RLS policies are enabled
- Verify email/password are correct

**Data not showing up:**
- Check that the user has permission to view the data (RLS policies)
- Verify foreign keys are set correctly
- Check Supabase logs for errors

**Real-time not working:**
- Ensure `realtime` is enabled for the `messages` table
- Check subscription code in the component
- Verify network connection

## Need Help?

If you run into issues:
1. Check the Supabase logs in your dashboard
2. Check browser console for errors
3. Review the RLS policies in the schema
4. Ask me for help! I can help debug or create migration scripts.

## Next Steps

After connecting to Supabase, you can:
- Remove all dummy data from `src/app/lib/data.ts`
- Add more sophisticated features (payment reminders, automated billing)
- Integrate with real SMS/email providers
- Connect to actual MikroTik WiFi system
- Build mobile apps that use the same backend
- Set up automated backups and monitoring
