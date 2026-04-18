-- Run this in your Supabase SQL Editor:

-- Create a table for public profiles
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text check (role in ('creator', 'host')),
  username text, -- Instagram/Social handle
  bio text,
  avatar_url text, -- For profile pics later
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." 
  on profiles for select 
  using (true);

create policy "Users can insert their own profile." 
  on profiles for insert 
  with check (auth.uid() = id);

create policy "Users can update own profile." 
  on profiles for update 
  using (auth.uid() = id);

-- Trigger for creating profile on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, full_name, username)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'role', 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$$ language plpgsql security modeller;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
