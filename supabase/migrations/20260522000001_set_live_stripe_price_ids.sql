-- Migration: wire live Stripe price IDs into plan_configs.
-- plan_configs is the source of truth for getPriceId() / getPlanTierFromPriceId()
-- in both the Next.js billing routes and the stripe-webhook edge function.
-- Without these, live subscriptions cannot resolve their plan tier.

update public.plan_configs set
  stripe_monthly_price_id = 'price_1TZjxU9DYOi07BZzN17z0G0Q',
  stripe_annual_price_id  = 'price_1TZjxU9DYOi07BZzBn4mtKVX'
where tier = 'pro';

update public.plan_configs set
  stripe_monthly_price_id = 'price_1TZjxQ9DYOi07BZzmRcjD6pd',
  stripe_annual_price_id  = 'price_1TZjxS9DYOi07BZzrukOPSHa'
where tier = 'team';
