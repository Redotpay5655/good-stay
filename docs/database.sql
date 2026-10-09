-- =====================================================================
-- B&B Website & Booking System — complete database schema
-- Run this ONCE in your own Supabase project: Dashboard → SQL Editor →
-- New query → paste everything → Run.  Safe to re-run (idempotent where
-- practical).
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum
    ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum
    ('pending', 'processing', 'awaiting_verification', 'completed', 'failed', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------
-- Profiles & roles (roles live in their own table — never on profiles)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','staff'))
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Site settings (single row, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default '[INSERT B&B NAME]',
  tagline text default '[Placeholder tagline — edit in Admin → Settings]',
  hero_headline text default 'A warm, quiet place to rest',
  hero_description text default '[Placeholder description — tell guests what makes your B&B special. Edit in Admin → Settings.]',
  hero_image_url text,
  logo_url text,
  about_title text default 'About us',
  about_text text default '[Placeholder about text — replace with your story in Admin → Settings.]',
  about_image_url text,
  phone text,
  email text,
  whatsapp text,          -- international format, digits only e.g. 2547XXXXXXXX
  address text default '[INSERT ADDRESS]',
  city text default '[INSERT LOCATION]',
  region text,
  postal_code text,
  country text not null default 'Kenya',
  latitude numeric(9,6),
  longitude numeric(9,6),
  map_embed_url text,     -- Google Maps "Embed a map" src URL
  google_maps_url text,   -- link to your Google Business Profile / Maps listing
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  check_in_time text default '14:00',
  check_out_time text default '10:00',
  cancellation_policy text default '[Placeholder cancellation policy — edit in Admin → Settings.]',
  house_rules text,
  why_stay jsonb not null default '[]'::jsonb,  -- [{title, text}]
  deposit_percent int not null default 100 check (deposit_percent between 1 and 100),
  pending_hold_minutes int not null default 30 check (pending_hold_minutes between 5 and 1440),
  booking_prefix text not null default 'BNB',
  currency text not null default 'KES',
  mpesa_paybill text,          -- shown to guests for manual payment
  mpesa_account_hint text default 'Use your booking reference as the account number',
  mpesa_till text,
  site_url text,
  price_range text default 'KES',
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Rooms
-- ---------------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  room_type text not null default 'Double',
  short_description text,
  description text,
  price_per_night numeric(12,2) not null check (price_per_night >= 0),
  max_guests int not null default 2 check (max_guests between 1 and 30),
  bed_type text,
  size_sqm numeric(6,1),
  facilities text[] not null default '{}',
  is_active boolean not null default true,      -- false = hidden from website
  is_available boolean not null default true,   -- false = shown but not bookable
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rooms_active_idx on public.rooms (is_active, sort_order);

create table if not exists public.room_images (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists room_images_room_idx on public.room_images (room_id, sort_order);

create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text default 'check',
  scope text not null default 'both' check (scope in ('room','property','both')),
  show_on_home boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.room_amenities (
  room_id uuid not null references public.rooms(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  primary key (room_id, amenity_id)
);
create index if not exists room_amenities_amenity_idx on public.room_amenities (amenity_id);

-- ---------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------
create table if not exists public.booking_counters (
  year int primary key,
  last_value int not null default 0
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  room_id uuid not null references public.rooms(id) on delete restrict,
  check_in date not null,
  check_out date not null,
  nights int generated always as (check_out - check_in) stored,
  guests int not null check (guests >= 1),
  nightly_rate numeric(12,2) not null,
  total_amount numeric(12,2) not null,
  amount_due_now numeric(12,2) not null,
  amount_paid numeric(12,2) not null default 0,
  currency text not null default 'KES',
  status public.booking_status not null default 'pending',
  source text not null default 'website',
  expires_at timestamptz,     -- pending hold expiry; null = hold indefinitely
  admin_notes text,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_dates_chk check (check_out > check_in),
  constraint bookings_no_overlap exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status in ('pending','confirmed','checked_in'))
);
create index if not exists bookings_room_dates_idx on public.bookings (room_id, check_in, check_out);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_check_in_idx on public.bookings (check_in);
create index if not exists bookings_created_idx on public.bookings (created_at desc);

create table if not exists public.booking_guests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text not null check (char_length(phone) between 7 and 20),
  special_requests text check (char_length(special_requests) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists booking_guests_email_idx on public.booking_guests (lower(email));

create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  start_date date not null,
  end_date date not null,   -- exclusive (first free night)
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);
create index if not exists availability_blocks_room_idx on public.availability_blocks (room_id, start_date, end_date);

-- ---------------------------------------------------------------------
-- Payments (provider-agnostic: mpesa_stk, mpesa_manual, card, cash, bank)
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  method text not null check (method in ('mpesa_stk','mpesa_manual','card','cash','bank_transfer','other')),
  provider text not null default 'mpesa',
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'KES',
  status public.payment_status not null default 'pending',
  reference text,                  -- M-Pesa receipt code / provider txn id
  phone text,
  checkout_request_id text unique, -- Daraja STK
  merchant_request_id text,
  result_code text,
  result_desc text,
  raw jsonb,
  transaction_date timestamptz,
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_booking_idx on public.payments (booking_id);
create index if not exists payments_status_idx on public.payments (status);
create unique index if not exists payments_reference_uq on public.payments (upper(reference))
  where reference is not null and status in ('completed','awaiting_verification');

-- ---------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  guest_location text,
  quote text not null check (char_length(quote) <= 1200),
  rating int not null default 5 check (rating between 1 and 5),
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  category text default 'General',
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  channel text not null,      -- email | whatsapp | sms
  template text not null,
  recipient text,
  status text not null,       -- sent | failed | skipped
  error text,
  created_at timestamptz not null default now()
);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['profiles','site_settings','rooms','bookings','payments'] loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s', t);
    execute format('create trigger trg_%1$s_updated before update on public.%1$s for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Booking logic (security definer, validated server-side)
-- ---------------------------------------------------------------------

-- Releases expired pending holds so their dates become bookable again.
create or replace function public.release_expired_holds()
returns void language sql security definer set search_path = public as $$
  update public.bookings set status = 'cancelled', cancelled_at = now(),
         admin_notes = coalesce(admin_notes || E'\n', '') || 'Auto-cancelled: payment hold expired'
  where status = 'pending' and expires_at is not null and expires_at < now();
$$;

-- Public: list of unavailable nights (as ranges) for a room
create or replace function public.get_room_unavailable(p_room_id uuid, p_from date, p_to date)
returns table (start_date date, end_date date)
language sql stable security definer set search_path = public as $$
  select b.check_in, b.check_out from public.bookings b
   where b.room_id = p_room_id and b.check_out > p_from and b.check_in < p_to
     and (b.status in ('confirmed','checked_in')
          or (b.status = 'pending' and (b.expires_at is null or b.expires_at > now())))
  union all
  select a.start_date, a.end_date from public.availability_blocks a
   where a.room_id = p_room_id and a.end_date > p_from and a.start_date < p_to
$$;

create or replace function public.is_room_free(p_room_id uuid, p_in date, p_out date)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.get_room_unavailable(p_room_id, p_in, p_out))
$$;

-- Public: ids of rooms free for the given range and guest count
create or replace function public.get_available_room_ids(p_check_in date, p_check_out date, p_guests int)
returns setof uuid language sql stable security definer set search_path = public as $$
  select r.id from public.rooms r
   where r.is_active and r.is_available and r.max_guests >= greatest(p_guests,1)
     and p_check_out > p_check_in
     and public.is_room_free(r.id, p_check_in, p_check_out)
$$;

-- Creates a pending booking. Price always comes from the database.
create or replace function public.create_booking(
  p_room_id uuid, p_check_in date, p_check_out date, p_guests int,
  p_full_name text, p_email text, p_phone text, p_special_requests text
) returns table (booking_id uuid, reference text, total_amount numeric, amount_due_now numeric, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_room public.rooms;
  v_settings public.site_settings;
  v_nights int;
  v_total numeric(12,2);
  v_due numeric(12,2);
  v_year int := extract(year from now())::int;
  v_seq int;
  v_ref text;
  v_id uuid;
  v_exp timestamptz;
begin
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'INVALID_DATES';
  end if;
  if p_check_in < (now() at time zone 'Africa/Nairobi')::date then
    raise exception 'PAST_DATE';
  end if;
  if p_check_out - p_check_in > 60 then raise exception 'STAY_TOO_LONG'; end if;

  -- Lock the room row to serialise concurrent bookings for it
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or not v_room.is_active or not v_room.is_available then
    raise exception 'ROOM_UNAVAILABLE';
  end if;
  if p_guests < 1 or p_guests > v_room.max_guests then raise exception 'TOO_MANY_GUESTS'; end if;

  perform public.release_expired_holds();
  if not public.is_room_free(p_room_id, p_check_in, p_check_out) then
    raise exception 'DATES_UNAVAILABLE';
  end if;

  select * into v_settings from public.site_settings where id = 1;
  v_nights := p_check_out - p_check_in;
  v_total := v_room.price_per_night * v_nights;
  v_due := ceil(v_total * v_settings.deposit_percent / 100.0);
  v_exp := now() + make_interval(mins => v_settings.pending_hold_minutes);

  insert into public.booking_counters (year, last_value) values (v_year, 1)
    on conflict (year) do update set last_value = public.booking_counters.last_value + 1
    returning last_value into v_seq;
  v_ref := v_settings.booking_prefix || '-' || v_year || '-' || lpad(v_seq::text, 4, '0');

  insert into public.bookings (reference, room_id, check_in, check_out, guests, nightly_rate,
                               total_amount, amount_due_now, currency, status, expires_at)
  values (v_ref, p_room_id, p_check_in, p_check_out, p_guests, v_room.price_per_night,
          v_total, v_due, v_settings.currency, 'pending', v_exp)
  returning id into v_id;

  insert into public.booking_guests (booking_id, full_name, email, phone, special_requests)
  values (v_id, trim(p_full_name), lower(trim(p_email)), trim(p_phone), nullif(trim(p_special_requests), ''));

  return query select v_id, v_ref, v_total, v_due, v_exp;
exception when exclusion_violation then
  raise exception 'DATES_UNAVAILABLE';
end $$;

-- Public: look up a booking by reference + email (minimal fields only)
create or replace function public.get_booking_public(p_reference text, p_email text)
returns table (
  reference text, status public.booking_status, room_name text, room_slug text,
  check_in date, check_out date, nights int, guests int, total_amount numeric,
  amount_due_now numeric, amount_paid numeric, currency text, guest_name text,
  expires_at timestamptz, latest_payment_status public.payment_status, latest_payment_method text
) language sql stable security definer set search_path = public as $$
  select b.reference, b.status, r.name, r.slug, b.check_in, b.check_out, b.nights, b.guests,
         b.total_amount, b.amount_due_now, b.amount_paid, b.currency, g.full_name, b.expires_at,
         p.status, p.method
    from public.bookings b
    join public.booking_guests g on g.booking_id = b.id
    join public.rooms r on r.id = b.room_id
    left join lateral (select status, method from public.payments
                        where booking_id = b.id order by created_at desc limit 1) p on true
   where b.reference = upper(trim(p_reference)) and g.email = lower(trim(p_email))
$$;

-- When a payment completes, update the booking totals/status
create or replace function public.apply_payment_to_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_paid numeric;
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    select coalesce(sum(amount),0) into v_paid from public.payments
      where booking_id = new.booking_id and status = 'completed';
    update public.bookings
       set amount_paid = v_paid,
           status = case when status = 'pending' then 'confirmed' else status end,
           confirmed_at = coalesce(confirmed_at, now()),
           expires_at = null
     where id = new.booking_id;
  elsif new.status = 'awaiting_verification' then
    -- keep the dates held while staff verify the manual receipt
    update public.bookings set expires_at = null where id = new.booking_id and status = 'pending';
  end if;
  return new;
end $$;

drop trigger if exists trg_payment_apply on public.payments;
create trigger trg_payment_apply after insert or update of status on public.payments
  for each row execute function public.apply_payment_to_booking();

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.site_settings, public.rooms, public.room_images, public.amenities,
                public.room_amenities, public.testimonials, public.gallery to anon, authenticated;
grant insert, update, delete on public.site_settings, public.rooms, public.room_images, public.amenities,
                public.room_amenities, public.testimonials, public.gallery to authenticated;
grant select, insert, update, delete on public.bookings, public.booking_guests, public.payments,
                public.availability_blocks, public.notifications_log to authenticated;
grant select on public.profiles, public.user_roles to authenticated;
grant update on public.profiles to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke all on function public.create_booking(uuid,date,date,int,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_booking(uuid,date,date,int,text,text,text,text) to service_role;
grant execute on function public.get_room_unavailable(uuid,date,date) to anon, authenticated;
grant execute on function public.get_available_room_ids(date,date,int) to anon, authenticated;
grant execute on function public.is_room_free(uuid,date,date) to anon, authenticated;
revoke all on function public.get_booking_public(text,text) from public, anon, authenticated;
grant execute on function public.get_booking_public(text,text) to service_role;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;
grant execute on function public.release_expired_holds() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.site_settings enable row level security;
alter table public.rooms enable row level security;
alter table public.room_images enable row level security;
alter table public.amenities enable row level security;
alter table public.room_amenities enable row level security;
alter table public.booking_counters enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_guests enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.payments enable row level security;
alter table public.testimonials enable row level security;
alter table public.gallery enable row level security;
alter table public.notifications_log enable row level security;

-- helper macro: drop + create policies
do $$ begin
  -- profiles
  drop policy if exists "own profile read" on public.profiles;
  create policy "own profile read" on public.profiles for select to authenticated
    using (id = auth.uid() or public.is_staff(auth.uid()));
  drop policy if exists "own profile update" on public.profiles;
  create policy "own profile update" on public.profiles for update to authenticated
    using (id = auth.uid()) with check (id = auth.uid());

  -- user_roles: users can see their own roles (needed for admin check)
  drop policy if exists "own roles read" on public.user_roles;
  create policy "own roles read" on public.user_roles for select to authenticated
    using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

  -- site_settings
  drop policy if exists "settings public read" on public.site_settings;
  create policy "settings public read" on public.site_settings for select to anon, authenticated using (true);
  drop policy if exists "settings admin write" on public.site_settings;
  create policy "settings admin write" on public.site_settings for update to authenticated
    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

  -- rooms
  drop policy if exists "rooms public read" on public.rooms;
  create policy "rooms public read" on public.rooms for select to anon, authenticated
    using (is_active or public.is_staff(auth.uid()));
  drop policy if exists "rooms admin write" on public.rooms;
  create policy "rooms admin write" on public.rooms for all to authenticated
    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

  -- room_images
  drop policy if exists "room images public read" on public.room_images;
  create policy "room images public read" on public.room_images for select to anon, authenticated using (true);
  drop policy if exists "room images admin write" on public.room_images;
  create policy "room images admin write" on public.room_images for all to authenticated
    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

  -- amenities
  drop policy if exists "amenities public read" on public.amenities;
  create policy "amenities public read" on public.amenities for select to anon, authenticated using (true);
  drop policy if exists "amenities admin write" on public.amenities;
  create policy "amenities admin write" on public.amenities for all to authenticated
    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

  drop policy if exists "room amenities public read" on public.room_amenities;
  create policy "room amenities public read" on public.room_amenities for select to anon, authenticated using (true);
  drop policy if exists "room amenities admin write" on public.room_amenities;
  create policy "room amenities admin write" on public.room_amenities for all to authenticated
    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

  -- bookings & guests: staff only. Guests go through server functions.
  drop policy if exists "bookings staff all" on public.bookings;
  create policy "bookings staff all" on public.bookings for all to authenticated
    using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
  drop policy if exists "guests staff all" on public.booking_guests;
  create policy "guests staff all" on public.booking_guests for all to authenticated
    using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

  drop policy if exists "blocks staff all" on public.availability_blocks;
  create policy "blocks staff all" on public.availability_blocks for all to authenticated
    using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

  drop policy if exists "payments staff all" on public.payments;
  create policy "payments staff all" on public.payments for all to authenticated
    using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

  drop policy if exists "notifications staff read" on public.notifications_log;
  create policy "notifications staff read" on public.notifications_log for select to authenticated
    using (public.is_staff(auth.uid()));

  -- testimonials & gallery
  drop policy if exists "testimonials public read" on public.testimonials;
  create policy "testimonials public read" on public.testimonials for select to anon, authenticated
    using (is_published or public.is_staff(auth.uid()));
  drop policy if exists "testimonials admin write" on public.testimonials;
  create policy "testimonials admin write" on public.testimonials for all to authenticated
    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

  drop policy if exists "gallery public read" on public.gallery;
  create policy "gallery public read" on public.gallery for select to anon, authenticated
    using (is_published or public.is_staff(auth.uid()));
  drop policy if exists "gallery admin write" on public.gallery;
  create policy "gallery admin write" on public.gallery for all to authenticated
    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
end $$;

-- ---------------------------------------------------------------------
-- Storage: public "media" bucket, admin-only uploads
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'media');
drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));
drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));

-- =====================================================================
-- AFTER RUNNING: make yourself admin (replace the email):
--   insert into public.user_roles (user_id, role)
--   select id, 'admin' from auth.users where email = 'you@example.com';
-- =====================================================================
