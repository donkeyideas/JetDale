-- Migration: make the Team plan publicly visible and purchasable.
-- The `plan_public_read` RLS policy only exposes rows where is_active = true,
-- so the Team plan was hidden from the pricing page until now.

update public.plan_configs set is_active = true where tier = 'team';
