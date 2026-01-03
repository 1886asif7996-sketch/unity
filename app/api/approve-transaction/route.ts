import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Note: Service Role Key is better for Admin APIs, but Anon works with RLS Policies set for 'admin' user.
    );

    try {
        const { transactionId, adminId } = await request.json();

        // Verify Admin (Double check on server side)
        const { data: adminUser } = await supabase.from('profiles').select('role').eq('id', adminId).single();
        if (!adminUser || adminUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Approve Transaction
        const { data, error } = await supabase
            .from('transactions')
            .update({ is_approved: true })
            .eq('id', transactionId)
            .select();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
