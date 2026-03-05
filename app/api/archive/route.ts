import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: archives, error } = await supabase
            .from('archives')
            .select('id, nickname, initial_setup, explanation, created_at, image_path, likes')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map column names to camelCase if necessary (matching previous JSON structure)
        const summary = archives.map((a: any) => ({
            id: a.id,
            nickname: a.nickname,
            initialSetup: a.initial_setup,
            explanation: a.explanation,
            createdAt: a.created_at,
            imagePath: a.image_path,
            likes: a.likes || 0
        }));

        return NextResponse.json(summary);
    } catch (error) {
        console.error('Error reading archives:', error);
        return NextResponse.json({ error: 'Failed to read archives' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { nickname, initialSetup, explanation, history, logs, image, authorId } = body;

        const id = Date.now().toString();
        const createdAt = new Date().toISOString();
        let imagePath = '';
        // For now, we store the image as a base64 string in the DB text column.
        // In a future update, this should be moved to Supabase Storage.
        if (image) {
            imagePath = image;
        }

        const newArchive = {
            id,
            nickname: nickname || 'Anonymous',
            initial_setup: initialSetup || '',
            explanation: explanation || '',
            history: history || [],
            logs: logs || [],
            image_path: imagePath,
            created_at: createdAt,
            author_id: authorId || '',
            likes: 0,
            liked_by: []
        };

        const { error } = await supabase.from('archives').insert([newArchive]);
        if (error) throw error;

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error('Error saving archive:', error);
        return NextResponse.json({
            error: 'Failed to save archive',
            details: error.message
        }, { status: 500 });
    }
}
