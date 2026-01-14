-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE
-- Stores both Customers and Service Providers
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  full_name text,
  role text check (role in ('customer', 'provider', 'admin')) default 'customer',
  phone_number text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PROVIDER PROFILES
-- Extended details for Service Providers (hourly rate, service type, verification)
create table public.provider_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  service_type text not null, -- e.g., 'plumbing', 'electrical', 'towing'
  hourly_rate numeric(10, 2) not null,
  bio text,
  is_verified boolean default false,
  rating numeric(3, 2) default 5.0,
  total_jobs integer default 0,
  current_lat double precision, -- For live tracking
  current_lon double precision
);

-- 3. BOOKINGS
-- The core job transaction
create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.users(id) not null,
  provider_id uuid references public.users(id), -- Can be null initially if broadcasting
  service_type text not null,
  status text check (status in ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')) default 'pending',
  scheduled_at timestamp with time zone,
  address_text text not null,
  lat double precision,
  lon double precision,
  estimated_price numeric(10, 2),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. REVIEWS (Optional)
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id),
  reviewer_id uuid references public.users(id),
  reviewee_id uuid references public.users(id),
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default now()
);

-- Row Level Security (RLS) - Basic Setup
-- Enable RLS
alter table public.users enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.bookings enable row level security;

-- Policies (Permissive for backend service role, restrictive for direct access if you used Supabase Client)
-- Since we are using a Node.js backend, we will likely connect using the SERVICE_ROLE key or a connection string, which bypasses RLS.
-- However, if you use the Supabase JS Client on the frontend, you'll need these:

create policy "Public profiles are viewable by everyone" on public.users for select using (true);
create policy "Users can insert their own profile" on public.users for insert with check (true);
create policy "Users can update their own profile" on public.users for update using (auth.uid() = id);

create policy "Providers are viewable by everyone" on public.provider_profiles for select using (true);

create policy "Users can view their own bookings" on public.bookings for select using (auth.uid() = customer_id or auth.uid() = provider_id);
