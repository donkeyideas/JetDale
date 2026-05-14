-- Set info@donkeyideas.com as super admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'info@donkeyideas.com';
