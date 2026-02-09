-- Fix NULL gender values in events
UPDATE public.events
SET gender = 'all'
WHERE gender IS NULL;

-- Verify the fix
SELECT 
    id,
    title,
    gender,
    organizer_id
FROM public.events
WHERE organizer_id = 'user_39CLe9fkwed4SyUXp3oD8fRoGgT'
ORDER BY created_at DESC;
