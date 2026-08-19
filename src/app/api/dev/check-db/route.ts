import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email') || 'vikbobinski@gmail.com';
  
  try {
    const supabase = createAdminClient();
    
    // 1. Check if the customer exists in the public table
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    // 2. Check if we can fetch users from Auth (requires valid service role)
    const authRes = await supabase.auth.admin.getUserById('00000000-0000-0000-0000-000000000000');
    
    return NextResponse.json({
      diagnostic: {
        email_checked: email,
        customer_table_data: customerData,
        customer_table_error: customerError,
        is_service_role_valid: authRes.error?.status !== 401 && authRes.error?.status !== 403,
        auth_error_code: authRes.error?.status,
        supabase_url_prefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 25)
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
