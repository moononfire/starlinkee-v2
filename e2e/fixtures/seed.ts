import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TEST_PLATE_NUMBERS = ['ACTIVE', 'PENDNG', 'NOSSUB', 'ENACTL'];

export async function cleanupTestReviews() {
  const db = adminClient();
  const { data: plates } = await db
    .from('plates')
    .select('plate_id')
    .in('plate_number', TEST_PLATE_NUMBERS);

  if (!plates?.length) return;

  const ids = plates.map((p) => p.plate_id);
  await db.from('reviews').delete().in('plate_id', ids);
}
