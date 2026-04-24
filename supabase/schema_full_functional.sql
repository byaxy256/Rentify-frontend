-- Rentify Full Supabase Schema (Idempotent)
-- Run this entire script in Supabase SQL Editor.
-- It creates all required tables, relationships, RLS, triggers, and auth/profile sync.

create extension if not exists "uuid-ossp";

-- ============================================================================
-- Core helper function
-- ============================================================================

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- ============================================================================
-- Profiles (extends auth.users)
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  phone text,
  role text not null default 'tenant' check (role in ('admin', 'landlord', 'tenant')),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_phone on public.profiles(phone);

-- Prevent duplicate profile insert failures when both backend and auth triggers
-- attempt to create the same profile row.
create or replace function public.skip_duplicate_profile_insert()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.profiles p where p.id = new.id) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_skip_duplicate_insert on public.profiles;
create trigger profiles_skip_duplicate_insert
before insert on public.profiles
for each row execute procedure public.skip_duplicate_profile_insert();

-- Keep policy creation idempotent
-- profiles policies
 drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

 drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger for updated_at
 drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row execute procedure public.update_updated_at_column();

-- ============================================================================
-- Auto-create profile rows for auth users
-- ============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'role', 'tenant')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    role = coalesce(excluded.role, public.profiles.role),
    updated_at = timezone('utc'::text, now());

  return new;
end;
$$;

 drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- Backfill existing auth users into profiles
insert into public.profiles (id, email, full_name, phone, role)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, 'user'), '@', 1)),
  u.raw_user_meta_data ->> 'phone',
  coalesce(u.raw_user_meta_data ->> 'role', 'tenant')
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, public.profiles.full_name),
  phone = coalesce(excluded.phone, public.profiles.phone),
  role = coalesce(excluded.role, public.profiles.role),
  updated_at = timezone('utc'::text, now());

-- ============================================================================
-- Buildings
-- ============================================================================

create table if not exists public.buildings (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location text not null,
  total_units integer not null,
  occupied_units integer not null default 0,
  landlord_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.buildings enable row level security;

 drop trigger if exists update_buildings_updated_at on public.buildings;
create trigger update_buildings_updated_at
before update on public.buildings
for each row execute procedure public.update_updated_at_column();

 drop policy if exists "Landlords can view their buildings" on public.buildings;
create policy "Landlords can view their buildings"
  on public.buildings for select
  using (
    auth.uid() = landlord_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

 drop policy if exists "Landlords can create buildings" on public.buildings;
create policy "Landlords can create buildings"
  on public.buildings for insert
  with check (
    auth.uid() = landlord_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

 drop policy if exists "Landlords can update their buildings" on public.buildings;
create policy "Landlords can update their buildings"
  on public.buildings for update
  using (
    auth.uid() = landlord_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    auth.uid() = landlord_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================================
-- Floors
-- ============================================================================

create table if not exists public.floors (
  id uuid primary key default uuid_generate_v4(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  floor_number integer not null,
  units_count integer not null,
  rent_per_unit numeric(10,2) not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique (building_id, floor_number)
);

alter table public.floors enable row level security;

 drop policy if exists "Users can view floors of accessible buildings" on public.floors;
create policy "Users can view floors of accessible buildings"
  on public.floors for select
  using (
    exists (
      select 1
      from public.buildings b
      where b.id = floors.building_id
      and (
        b.landlord_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
    )
  );

-- ============================================================================
-- Units
-- ============================================================================

create table if not exists public.units (
  id uuid primary key default uuid_generate_v4(),
  floor_id uuid not null references public.floors(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_number text not null,
  rent numeric(10,2) not null,
  is_occupied boolean not null default false,
  tenant_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique (building_id, unit_number)
);

alter table public.units enable row level security;

 drop trigger if exists update_units_updated_at on public.units;
create trigger update_units_updated_at
before update on public.units
for each row execute procedure public.update_updated_at_column();

 drop policy if exists "Users can view units" on public.units;
create policy "Users can view units"
  on public.units for select
  using (
    tenant_id = auth.uid()
    or exists (select 1 from public.buildings b where b.id = units.building_id and b.landlord_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================================
-- Tenant details
-- ============================================================================

create table if not exists public.tenant_details (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid unique not null references public.profiles(id) on delete cascade,
  occupation text,
  next_of_kin text,
  next_of_kin_contact text,
  assigned_date date,
  lease_start_date date,
  lease_end_date date,
  security_deposit numeric(10,2),
  has_accepted_lease boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.tenant_details enable row level security;

 drop trigger if exists update_tenant_details_updated_at on public.tenant_details;
create trigger update_tenant_details_updated_at
before update on public.tenant_details
for each row execute procedure public.update_updated_at_column();

-- ============================================================================
-- Payments
-- ============================================================================

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  unit_id uuid references public.units(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade,
  amount numeric(10,2) not null,
  method text not null check (method in ('MTN', 'Airtel', 'Bank')),
  status text not null check (status in ('completed', 'pending', 'failed')),
  type text not null check (type in ('rent', 'bill', 'wifi')),
  phone_number text,
  receipt_number text,
  date timestamp with time zone not null default timezone('utc'::text, now()),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.payments enable row level security;

 drop policy if exists "Tenants can view their payments" on public.payments;
create policy "Tenants can view their payments"
  on public.payments for select
  using (tenant_id = auth.uid());

 drop policy if exists "Landlords can view payments for their buildings" on public.payments;
create policy "Landlords can view payments for their buildings"
  on public.payments for select
  using (
    exists (
      select 1 from public.buildings b
      where b.id = payments.building_id and b.landlord_id = auth.uid()
    )
  );

 drop policy if exists "Tenants can create payments" on public.payments;
create policy "Tenants can create payments"
  on public.payments for insert
  with check (tenant_id = auth.uid());

-- ============================================================================
-- Bills
-- ============================================================================

create table if not exists public.bills (
  id uuid primary key default uuid_generate_v4(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  type text not null check (type in ('water', 'electricity', 'rubbish', 'ura', 'wifi')),
  amount numeric(10,2) not null,
  due_date date not null,
  status text not null check (status in ('paid', 'pending', 'overdue')),
  paid_date date,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.bills enable row level security;

 drop trigger if exists update_bills_updated_at on public.bills;
create trigger update_bills_updated_at
before update on public.bills
for each row execute procedure public.update_updated_at_column();

 drop policy if exists "Landlords can view bills for their buildings" on public.bills;
create policy "Landlords can view bills for their buildings"
  on public.bills for select
  using (
    exists (select 1 from public.buildings b where b.id = bills.building_id and b.landlord_id = auth.uid())
  );

 drop policy if exists "Landlords can create bills" on public.bills;
create policy "Landlords can create bills"
  on public.bills for insert
  with check (
    exists (select 1 from public.buildings b where b.id = bills.building_id and b.landlord_id = auth.uid())
  );

-- ============================================================================
-- Tenant requests
-- ============================================================================

create table if not exists public.tenant_requests (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  message text not null,
  status text not null check (status in ('pending', 'in-progress', 'resolved')),
  response text,
  response_date timestamp with time zone,
  date timestamp with time zone not null default timezone('utc'::text, now()),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.tenant_requests enable row level security;

 drop trigger if exists update_tenant_requests_updated_at on public.tenant_requests;
create trigger update_tenant_requests_updated_at
before update on public.tenant_requests
for each row execute procedure public.update_updated_at_column();

 drop policy if exists "Tenants can view their requests" on public.tenant_requests;
create policy "Tenants can view their requests"
  on public.tenant_requests for select
  using (tenant_id = auth.uid());

 drop policy if exists "Landlords can view requests for their buildings" on public.tenant_requests;
create policy "Landlords can view requests for their buildings"
  on public.tenant_requests for select
  using (
    exists (select 1 from public.buildings b where b.id = tenant_requests.building_id and b.landlord_id = auth.uid())
  );

 drop policy if exists "Tenants can create requests" on public.tenant_requests;
create policy "Tenants can create requests"
  on public.tenant_requests for insert
  with check (tenant_id = auth.uid());

 drop policy if exists "Landlords can update requests for their buildings" on public.tenant_requests;
create policy "Landlords can update requests for their buildings"
  on public.tenant_requests for update
  using (
    exists (select 1 from public.buildings b where b.id = tenant_requests.building_id and b.landlord_id = auth.uid())
  )
  with check (
    exists (select 1 from public.buildings b where b.id = tenant_requests.building_id and b.landlord_id = auth.uid())
  );

-- ============================================================================
-- Messages
-- ============================================================================

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  timestamp timestamp with time zone not null default timezone('utc'::text, now()),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.messages enable row level security;

 drop policy if exists "Users can view their messages" on public.messages;
create policy "Users can view their messages"
  on public.messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

 drop policy if exists "Users can send messages" on public.messages;
create policy "Users can send messages"
  on public.messages for insert
  with check (sender_id = auth.uid());

 drop policy if exists "Recipients can mark messages as read" on public.messages;
create policy "Recipients can mark messages as read"
  on public.messages for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ============================================================================
-- Expenses
-- ============================================================================

create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  date date not null,
  category text not null check (category in ('repairs', 'maintenance', 'utilities', 'improvements', 'other')),
  description text not null,
  amount numeric(10,2) not null,
  payee text not null,
  receipt_url text,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.expenses enable row level security;

 drop policy if exists "Landlords can view expenses for their buildings" on public.expenses;
create policy "Landlords can view expenses for their buildings"
  on public.expenses for select
  using (exists (select 1 from public.buildings b where b.id = expenses.building_id and b.landlord_id = auth.uid()));

 drop policy if exists "Landlords can create expenses" on public.expenses;
create policy "Landlords can create expenses"
  on public.expenses for insert
  with check (exists (select 1 from public.buildings b where b.id = expenses.building_id and b.landlord_id = auth.uid()));

-- ============================================================================
-- Documents
-- ============================================================================

create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  building_id uuid references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  tenant_id uuid references public.profiles(id) on delete set null,
  name text not null,
  type text not null check (type in ('receipt', 'inspection', 'agreement', 'other')),
  category text,
  file_url text not null,
  file_size text,
  expiry_date date,
  upload_date timestamp with time zone not null default timezone('utc'::text, now()),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.documents enable row level security;

 drop policy if exists "Users can view relevant documents" on public.documents;
create policy "Users can view relevant documents"
  on public.documents for select
  using (
    tenant_id = auth.uid()
    or exists (select 1 from public.buildings b where b.id = documents.building_id and b.landlord_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================================
-- WiFi subscriptions
-- ============================================================================

create table if not exists public.wifi_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  plan_type text not null check (plan_type in ('daily', 'weekly', 'monthly')),
  amount numeric(10,2) not null,
  username text not null,
  password text not null,
  voucher_code text not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.wifi_subscriptions enable row level security;

 drop policy if exists "Tenants can view their WiFi subscriptions" on public.wifi_subscriptions;
create policy "Tenants can view their WiFi subscriptions"
  on public.wifi_subscriptions for select
  using (tenant_id = auth.uid());

 drop policy if exists "Landlords can view WiFi subscriptions for their buildings" on public.wifi_subscriptions;
create policy "Landlords can view WiFi subscriptions for their buildings"
  on public.wifi_subscriptions for select
  using (
    exists (
      select 1
      from public.units u
      join public.buildings b on b.id = u.building_id
      where u.id = wifi_subscriptions.unit_id
        and b.landlord_id = auth.uid()
    )
  );

-- ============================================================================
-- Indexes
-- ============================================================================

create index if not exists idx_buildings_landlord on public.buildings(landlord_id);
create index if not exists idx_floors_building on public.floors(building_id);
create index if not exists idx_units_building on public.units(building_id);
create index if not exists idx_units_tenant on public.units(tenant_id);
create index if not exists idx_payments_tenant on public.payments(tenant_id);
create index if not exists idx_payments_building on public.payments(building_id);
create index if not exists idx_payments_date on public.payments(date);
create index if not exists idx_bills_building on public.bills(building_id);
create index if not exists idx_requests_tenant on public.tenant_requests(tenant_id);
create index if not exists idx_requests_building on public.tenant_requests(building_id);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_recipient on public.messages(recipient_id);
create index if not exists idx_expenses_building on public.expenses(building_id);
create index if not exists idx_documents_building on public.documents(building_id);
create index if not exists idx_wifi_tenant on public.wifi_subscriptions(tenant_id);

-- ============================================================================
-- Realtime
-- ============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
