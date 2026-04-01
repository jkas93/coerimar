import { createClient } from '@supabase/supabase-js';

// The admin client uses the service role key to bypass RLS and Auth limits
// DANGER: NEVER export this to the client-side. This must only be used in Server Actions or API routes.
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};
