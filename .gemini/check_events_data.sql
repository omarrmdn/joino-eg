-- SQL queries to diagnose and fix event data issues

-- 1. Check all events and their critical fields
SELECT 
    id,
    title,
    organizer_id,
    date,
    time,
    price,
    location,
    description,
    created_at
FROM public.events
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if organizer_id references exist in users table
SELECT 
    e.id as event_id,
    e.title,
    e.organizer_id,
    u.id as user_exists,
    u.name as organizer_name
FROM public.events e
LEFT JOIN public.users u ON e.organizer_id = u.id
WHERE e.organizer_id IS NOT NULL
LIMIT 10;

-- 3. Find events with NULL critical fields
SELECT 
    id,
    CASE WHEN title IS NULL THEN 'NULL title' ELSE 'OK' END as title_status,
    CASE WHEN date IS NULL THEN 'NULL date' ELSE 'OK' END as date_status,
    CASE WHEN time IS NULL THEN 'NULL time' ELSE 'OK' END as time_status,
    CASE WHEN organizer_id IS NULL THEN 'NULL organizer' ELSE 'OK' END as organizer_status
FROM public.events
WHERE title IS NULL 
   OR date IS NULL 
   OR time IS NULL
LIMIT 10;

-- 4. Example: Update events to have valid default values (ONLY RUN IF YOU WANT TO FIX DATA)
-- UNCOMMENT AND MODIFY AS NEEDED:
/*
UPDATE public.events
SET 
    title = COALESCE(title, 'Sample Event'),
    date = COALESCE(date, CURRENT_DATE + INTERVAL '7 days'),
    time = COALESCE(time, '18:00:00'::time),
    price = COALESCE(price, 0),
    location = COALESCE(location, 'TBD'),
    description = COALESCE(description, 'Event description coming soon')
WHERE title IS NULL 
   OR date IS NULL 
   OR time IS NULL;
*/

-- 5. Check users table to see if there are any users to assign as organizers
SELECT id, name, email FROM public.users LIMIT 5;
