-- KIUVO CRM — Demo seed data
-- Run AFTER schema.sql and AFTER creating users in Supabase Auth dashboard
-- Replace UUIDs with actual user IDs from your Auth > Users table

-- Create demo users via Supabase Dashboard:
-- 1. vendedor@kiuvo.mx  / Demo1234!  → role: seller
-- 2. admin@kiuvo.mx     / Demo1234!  → role: admin
-- Then update the profiles table to set proper names/roles.

-- Example (replace with real UUIDs from auth.users):
-- update profiles set full_name='Luis Ramírez', initials='LR', role='seller', avatar_color='#185FA5' where id='<seller-uuid>';
-- update profiles set full_name='Sofía Castillo', initials='SC', role='admin',  avatar_color='#185FA5' where id='<admin-uuid>';

-- Demo prospects (replace owner_id with real UUIDs)
-- insert into prospects (name, value, stage_id, owner_id, health, address)
-- values
--   ('Ferretería del Valle',    18500, 'presentacion', '<seller-uuid>', 'amber', 'Av. Constituyentes 412, Querétaro'),
--   ('Distribuidora Norte',     42800, 'negociacion',  '<seller-uuid>', 'green', 'Blvd. Bernardo Quintana 4200'),
--   ('Constructora ABC',        24500, 'cierre',       '<seller-uuid>', 'green', 'Parque Industrial Bernardo Q.'),
--   ('Refaccionaria El Bajío',  22000, 'presentacion', '<seller-uuid>', 'red',   'Calle 5 de Febrero 88'),
--   ('Materiales Pacífico',     28900, 'cotizacion',   '<seller-uuid>', 'amber', 'Av. Zaragoza 1540');
