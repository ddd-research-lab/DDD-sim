import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Get today's count
        const { data: dailyData, error: dailyError } = await supabase
            .from('access_stats')
            .select('count')
            .eq('date', today)
            .single();

        // Get total count (sum of all daily counts)
        const { data: totalData, error: totalError } = await supabase
            .rpc('get_total_access'); // We might need a small function or just sum it

        // If RPC doesn't exist, we can sum here or use a simpler query
        const { data: sumData, error: sumError } = await supabase
            .from('access_stats')
            .select('count');

        const total = sumData?.reduce((acc, curr) => acc + (curr.count || 0), 0) || 0;

        return NextResponse.json({
            total: total,
            daily: dailyData?.count || 0
        });
    } catch (error) {
        console.error('Error reading analytics:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST() {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Upsert daily count: Increment by 1
        // Since Supabase doesn't have a direct "increment" upsert in one go easily without RPC, 
        // we'll do a simple select-then-upsert or use a specialized RPC if available.
        // For simplicity and to avoid race conditions, an RPC is better, but let's try a standard upsert for now.

        const { data, error: fetchError } = await supabase
            .from('access_stats')
            .select('count')
            .eq('date', today)
            .single();

        const currentCount = data?.count || 0;
        const { error: upsertError } = await supabase
            .from('access_stats')
            .upsert({ date: today, count: currentCount + 1 });

        if (upsertError) throw upsertError;

        // Fetch new totals
        const { data: allData } = await supabase.from('access_stats').select('count');
        const total = allData?.reduce((acc, curr) => acc + (curr.count || 0), 0) || 0;

        return NextResponse.json({
            total: total,
            daily: currentCount + 1
        });
    } catch (error: any) {
        console.error('Error updating analytics:', error);
        return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
    }
}
