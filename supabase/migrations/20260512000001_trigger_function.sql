-- Migration 001: set_updated_at trigger function
-- Reusable trigger that sets updated_at to now() on every row mutation.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
