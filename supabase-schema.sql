-- Supabase Database Schema for Rentify
-- Run this SQL in your Supabase SQL Editor after connecting

-- ============================================================================
-- Enable necessary extensions
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================================
-- User Profiles (extends Supabase auth.users)
-- ============================================================================

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  phone text,
  role text check (role in ('admin', 'landlord', 'tenant')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- ============================================================================
-- Buildings
-- ============================================================================

create table buildings (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location text not null,
  total_units integer not null,
  occupied_units integer default 0,
  landlord_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table buildings enable row level security;

create policy "Landlords can view their buildings"
  on buildings for select
  using (auth.uid() = landlord_id or exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Landlords can create buildings"
  on buildings for insert
  with check (auth.uid() = landlord_id);

create policy "Landlords can update their buildings"
  on buildings for update
  using (auth.uid() = landlord_id);

-- ============================================================================
-- Floors
-- ============================================================================

create table floors (
  id uuid default uuid_generate_v4() primary key,
  building_id uuid references buildings(id) on delete cascade not null,
  floor_number integer not null,
  units_count integer not null,
  rent_per_unit decimal(10, 2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(building_id, floor_number)
);

alter table floors enable row level security;

create policy "Users can view floors of accessible buildings"
  on floors for select
  using (exists (
    select 1 from buildings b where b.id = building_id and (
      b.landlord_id = auth.uid() or exists (
        select 1 from profiles where id = auth.uid() and role = 'admin'
      )
    )
  ));

-- ============================================================================
-- Units
-- ============================================================================

create table units (
  id uuid default uuid_generate_v4() primary key,
  floor_id uuid references floors(id) on delete cascade not null,
  building_id uuid references buildings(id) on delete cascade not null,
  unit_number text not null,
  rent decimal(10, 2) not null,
  is_occupied boolean default false,
  tenant_id uuid references profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(building_id, unit_number)
);

alter table units enable row level security;

create policy "Users can view units"
  on units for select
  using (
    tenant_id = auth.uid() or exists (
      select 1 from buildings b where b.id = building_id and b.landlord_id = auth.uid()
    ) or exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================================
-- Tenant Details
-- ============================================================================

create table tenant_details (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references profiles(id) on delete cascade unique not null,
  occupation text,
  next_of_kin text,
  next_of_kin_contact text,
  assigned_date date,
  lease_start_date date,
  lease_end_date date,
  security_deposit decimal(10, 2),
  has_accepted_lease boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table tenant_details enable row level security;

-- ============================================================================
-- Payments
-- ============================================================================

create table payments (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references profiles(id) on delete cascade not null,
  unit_id uuid references units(id) on delete cascade,
  building_id uuid references buildings(id) on delete cascade,
  amount decimal(10, 2) not null,
  method text check (method in ('MTN', 'Airtel', 'Bank')) not null,
  status text check (status in ('completed', 'pending', 'failed')) not null,
  type text check (type in ('rent', 'bill', 'wifi')) not null,
  phone_number text,
  receipt_number text,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table payments enable row level security;

create policy "Tenants can view their payments"
  on payments for select
  using (tenant_id = auth.uid());

create policy "Landlords can view payments for their buildings"
  on payments for select
  using (exists (
    select 1 from buildings b where b.id = building_id and b.landlord_id = auth.uid()
  ));

create policy "Tenants can create payments"
  on payments for insert
  with check (tenant_id = auth.uid());

-- ============================================================================
-- Bills
-- ============================================================================

create table bills (
  id uuid default uuid_generate_v4() primary key,
  building_id uuid references buildings(id) on delete cascade not null,
  unit_id uuid references units(id) on delete set null,
  type text check (type in ('water', 'electricity', 'rubbish', 'ura', 'wifi')) not null,
  amount decimal(10, 2) not null,
  due_date date not null,
  status text check (status in ('paid', 'pending', 'overdue')) not null,
  paid_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table bills enable row level security;

create policy "Landlords can view bills for their buildings"
  on bills for select
  using (exists (
    select 1 from buildings b where b.id = building_id and b.landlord_id = auth.uid()
  ));

create policy "Landlords can create bills"
  on bills for insert
  with check (exists (
    select 1 from buildings b where b.id = building_id and b.landlord_id = auth.uid()
  ));

-- ============================================================================
-- Tenant Requests (Maintenance/Service)
-- ============================================================================

create table tenant_requests (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references profiles(id) on delete cascade not null,
  unit_id uuid references units(id) on delete cascade not null,
  building_id uuid references buildings(id) on delete cascade not null,
  message text not null,
  status text check (status in ('pending', 'in-progress', 'resolved')) not null,
  response text,
  response_date timestamp with time zone,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table tenant_requests enable row level security;

create policy "Tenants can view their requests"
  on tenant_requests for select
  using (tenant_id = auth.uid());

create policy "Landlords can view requests for their buildings"
  on tenant_requests for select
  using (exists (
    select 1 from buildings b where b.id = building_id and b.landlord_id = auth.uid()
  ));

create policy "Tenants can create requests"
  on tenant_requests for insert
  with check (tenant_id = auth.uid());

create policy "Landlords can update requests for their buildings"
  on tenant_requests for update
  using (exists (
    select 1 from buildings b where b.id = building_id and b.landlord_id = auth.uid()
  ));

-- ============================================================================
-- Messages
-- ============================================================================

create table messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references profiles(id) on delete cascade not null,
  recipient_id uuid references profiles(id) on delete cascade not null,
  message text not null,
  read boolean default false,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table messages enable row level security;

create policy "Users can view their messages"
  on messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Users can send messages"
  on messages for insert
  with check (sender_id = auth.uid());

create policy "Recipients can mark messages as read"
  on messages for update
  using (recipient_id = auth.uid());

-- ============================================================================
-- Expenses
-- ============================================================================

create table expenses (
  id uuid default uuid_generate_v4() primary key,
  building_id uuid references buildings(id) on delete cascade not null,
  unit_id uuid references units(id) on delete set null,
  date date not null,
  category text check (category in ('repairs', 'maintenance', 'utilities', 'improvements', 'other')) not null,
  description text not null,
  amount decimal(10, 2) not null,
  payee text not null,
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table expenses enable row level security;

create policy "Landlords can view expenses for their buildings"
  on expenses for select
  using (exists (
    select 1 from buildings b where b.id = building_id and b.landlord_id = auth.uid()
  ));

create policy "Landlords can create expenses"
  on expenses for insert
  with check (exists (
    select 1 from buildings b where b.id = building_id and b.landlord_id = auth.uid()
  ));

-- ============================================================================
-- Documents
-- ============================================================================

create table documents (
  id uuid default uuid_generate_v4() primary key,
  building_id uuid references buildings(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  tenant_id uuid references profiles(id) on delete set null,
  name text not null,
  type text check (type in ('receipt', 'inspection', 'agreement', 'other')) not null,
  category text,
  file_url text not null,
  file_size text,
  expiry_date date,
  upload_date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table documents enable row level security;

create policy "Users can view relevant documents"
  on documents for select
  using (
    tenant_id = auth.uid() or exists (
      select 1 from buildings b where b.id = building_id and b.landlord_id = auth.uid()
    ) or exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================================
-- WiFi Subscriptions
-- ============================================================================

create table wifi_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references profiles(id) on delete cascade not null,
  unit_id uuid references units(id) on delete cascade not null,
  plan_type text check (plan_type in ('daily', 'weekly', 'monthly')) not null,
  amount decimal(10, 2) not null,
  username text not null,
  password text not null,
  voucher_code text not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table wifi_subscriptions enable row level security;

create policy "Tenants can view their WiFi subscriptions"
  on wifi_subscriptions for select
  using (tenant_id = auth.uid());

create policy "Landlords can view WiFi subscriptions for their buildings"
  on wifi_subscriptions for select
  using (exists (
    select 1 from units u
    join buildings b on b.id = u.building_id
    where u.id = unit_id and b.landlord_id = auth.uid()
  ));

-- ============================================================================
-- Audit Logs
-- ============================================================================

create table if not exists audit_logs (
  id uuid default uuid_generate_v4() primary key,
  actor_user_id uuid references profiles(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details text not null,
  ip_address text,
  status text check (status in ('success', 'failed')) default 'success',
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table audit_logs enable row level security;

create policy "Admins can view audit logs"
  on audit_logs for select
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Add triggers for updated_at
create trigger update_profiles_updated_at before update on profiles
  for each row execute procedure update_updated_at_column();

create trigger update_buildings_updated_at before update on buildings
  for each row execute procedure update_updated_at_column();

create trigger update_units_updated_at before update on units
  for each row execute procedure update_updated_at_column();

create trigger update_tenant_details_updated_at before update on tenant_details
  for each row execute procedure update_updated_at_column();

create trigger update_bills_updated_at before update on bills
  for each row execute procedure update_updated_at_column();

create trigger update_tenant_requests_updated_at before update on tenant_requests
  for each row execute procedure update_updated_at_column();

-- ============================================================================
-- Indexes for performance
-- ============================================================================

create index idx_buildings_landlord on buildings(landlord_id);
create index idx_floors_building on floors(building_id);
create index idx_units_building on units(building_id);
create index idx_units_tenant on units(tenant_id);
create index idx_payments_tenant on payments(tenant_id);
create index idx_payments_building on payments(building_id);
create index idx_payments_date on payments(date);
create index idx_bills_building on bills(building_id);
create index idx_requests_tenant on tenant_requests(tenant_id);
create index idx_requests_building on tenant_requests(building_id);
create index idx_messages_sender on messages(sender_id);
create index idx_messages_recipient on messages(recipient_id);
create index idx_expenses_building on expenses(building_id);
create index idx_documents_building on documents(building_id);
create index idx_wifi_tenant on wifi_subscriptions(tenant_id);
create index idx_audit_created_at on audit_logs(created_at desc);
create index idx_audit_actor on audit_logs(actor_user_id);
create index idx_audit_entity on audit_logs(entity_type, entity_id);

-- ============================================================================
-- Enable Realtime for messages
-- ============================================================================

alter publication supabase_realtime add table messages;

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- You can insert your current dummy data here for testing
