-- Supabase Schema for Draw App
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drawings table
create table if not exists public.drawings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  thumbnail text, -- base64 or URL
  data jsonb not null, -- stores drawingElements, comments, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User settings table (for API keys, preferences)
create table if not exists public.user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  anthropic_api_key text, -- encrypted in practice, but stored as text for simplicity
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.drawings enable row level security;
alter table public.user_settings enable row level security;

-- Policies for drawings
create policy "Users can view their own drawings"
  on public.drawings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own drawings"
  on public.drawings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own drawings"
  on public.drawings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own drawings"
  on public.drawings for delete
  using (auth.uid() = user_id);

-- Policies for user_settings
create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Function to auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger on_drawings_updated
  before update on public.drawings
  for each row execute procedure public.handle_updated_at();

create trigger on_user_settings_updated
  before update on public.user_settings
  for each row execute procedure public.handle_updated_at();

-- Index for faster queries
create index if not exists drawings_user_id_idx on public.drawings(user_id);
create index if not exists drawings_updated_at_idx on public.drawings(updated_at desc);
