import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getJSTDate() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

export async function GET() {
    try {
        const today = getJSTDate();

        const { data: allData, error } = await supabase
            .from('access_stats')
            .select('date, count')
            .order('date', { ascending: false });

        if (error) throw error;

        const total = allData?.reduce((acc, curr) => acc + (curr.count || 0), 0) || 0;
        const todayRecord = allData?.find(r => r.date === today);
        const daily = todayRecord?.count || 0;

        const recent10 = allData?.slice(0, 10) || [];
        const recent10Sum = recent10.reduce((acc, curr) => acc + (curr.count || 0), 0);
        const recent10Avg = recent10.length > 0 ? Number((recent10Sum / recent10.length).toFixed(1)) : 0;

        return NextResponse.json({
            total,
            daily,
            recent10Avg
        });
    } catch (error: any) {
        console.error('Error reading analytics:', error);
        return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
    }
}

export async function POST() {
    try {
        const today = getJSTDate();

        // Check today's current count
        const { data, error: fetchError } = await supabase
            .from('access_stats')
            .select('count')
            .eq('date', today)
            .maybeSingle();

        if (fetchError) throw fetchError;

        const currentCount = data?.count || 0;
        const newDailyCount = currentCount + 1;

        const { error: upsertError } = await supabase
            .from('access_stats')
            .upsert({ date: today, count: newDailyCount });

        if (upsertError) throw upsertError;

        // Fetch updated statistics
        const { data: allData, error: allError } = await supabase
            .from('access_stats')
            .select('date, count')
            .order('date', { ascending: false });

        if (allError) throw allError;

        const total = allData?.reduce((acc, curr) => acc + (curr.count || 0), 0) || 0;
        const recent10 = allData?.slice(0, 10) || [];
        const recent10Sum = recent10.reduce((acc, curr) => acc + (curr.count || 0), 0);
        const recent10Avg = recent10.length > 0 ? Number((recent10Sum / recent10.length).toFixed(1)) : 0;

        return NextResponse.json({
            total,
            daily: newDailyCount,
            recent10Avg
        });
    } catch (error: any) {
        console.error('Error updating analytics:', error);
        return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
    }
}
