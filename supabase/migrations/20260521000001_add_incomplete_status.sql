-- Add 'incomplete' to subscription_status enum.
-- The embedded Stripe billing flow creates a subscription row in the
-- `incomplete` state before payment is confirmed (matching Stripe's own
-- subscription status). Once the Payment Element succeeds it becomes 'active'.

alter type public.subscription_status add value if not exists 'incomplete';
