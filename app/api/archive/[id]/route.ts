import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data: archive, error } = await supabase
            .from('archives')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !archive) {
            return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
        }

        // Map snake_case to camelCase
        const archiveCamel = {
            ...archive,
            initialSetup: archive.initial_setup,
            createdAt: archive.created_at,
            authorId: archive.author_id,
            likedBy: archive.liked_by,
            imagePath: archive.image_path
        };

        return NextResponse.json(archiveCamel);
    } catch (error) {
        console.error('Error reading archive:', error);
        return NextResponse.json({ error: 'Failed to read archive' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { authorId } = await request.json();

        const { data: archive, error: fetchError } = await supabase
            .from('archives')
            .select('author_id')
            .eq('id', id)
            .single();

        if (fetchError || !archive) {
            return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
        }

        if (archive.author_id && archive.author_id !== authorId) {
            return NextResponse.json({ error: 'Unauthorized: Only the author can delete this' }, { status: 403 });
        }

        const { error: deleteError } = await supabase
            .from('archives')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting archive:', error);
        return NextResponse.json({ error: 'Failed to delete archive' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { userId } = await request.json();

        // Use a transaction-like update or RPC to handle likes to avoid race conditions
        // For simplicity:
        const { data: archive, error: fetchError } = await supabase
            .from('archives')
            .select('liked_by, likes')
            .eq('id', id)
            .single();

        if (fetchError || !archive) {
            return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
        }

        const likedBy = archive.liked_by || [];
        if (likedBy.includes(userId)) {
            return NextResponse.json({ error: 'Already liked' }, { status: 400 });
        }

        const { data: updated, error: updateError } = await supabase
            .from('archives')
            .update({
                liked_by: [...likedBy, userId],
                likes: (archive.likes || 0) + 1
            })
            .eq('id', id)
            .select('likes')
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, likes: updated.likes });
    } catch (error) {
        console.error('Error liking archive:', error);
        return NextResponse.json({ error: 'Failed to like archive' }, { status: 500 });
    }
}
