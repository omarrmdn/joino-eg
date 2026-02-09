-- Check events organized by omarrmdn2024@gmail.com
SELECT 
    e.id,
    e.title,
    e.organizer_id,
    e.date,
    e.time,
    e.price,
    e.location,
    e.description,
    e.gender,
    u.name as organizer_name,
    u.email as organizer_email
FROM public.events e
LEFT JOIN public.users u ON e.organizer_id = u.id
WHERE u.email = 'omarrmdn2024@gmail.com'
   OR e.organizer_id = 'user_39CLe9fkwed4SyUXp3oD8fRoGgT'
ORDER BY e.created_at DESC;

-- Fix NULL values for events organized by this user
-- This will set default values for any NULL fields
UPDATE public.events
SET 
    title = COALESCE(title, 'Event by Omar'),
    date = COALESCE(date, CURRENT_DATE + INTERVAL '7 days'),
    time = COALESCE(time, '18:00:00'::time),
    price = COALESCE(price, 0),
    location = COALESCE(location, 'Cairo, Egypt'),
    description = COALESCE(description, 'Join us for an exciting event!'),
    gender = COALESCE(gender, 'all')
WHERE organizer_id = 'user_39CLe9fkwed4SyUXp3oD8fRoGgT'
  AND (title IS NULL 
       OR date IS NULL 
       OR time IS NULL 
       OR price IS NULL);

-- Verify the fix
SELECT 
    e.id,
    e.title,
    e.organizer_id,
    e.date,
    e.time,
    e.price,
    e.location,
    e.description,
    e.gender,
    u.name as organizer_name
FROM public.events e
LEFT JOIN public.users u ON e.organizer_id = u.id
WHERE e.organizer_id = 'user_39CLe9fkwed4SyUXp3oD8fRoGgT'
ORDER BY e.created_at DESC;
