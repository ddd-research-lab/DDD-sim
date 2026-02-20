import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'archives.json');

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // In Next.js 15+, params is a Promise
) {
    try {
        const { id } = await params; // Await params

        if (!fs.existsSync(DATA_FILE_PATH)) {
            return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
        }
        const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
        const archives = JSON.parse(data);
        const archive = archives.find((a: any) => a.id === id);

        if (!archive) {
            return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
        }

        return NextResponse.json(archive);
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
        const { authorId } = await request.json(); // Accept authorId for verification

        if (!fs.existsSync(DATA_FILE_PATH)) {
            return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
        }

        const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
        let archives = JSON.parse(data);
        const archiveIndex = archives.findIndex((a: any) => a.id === id);

        if (archiveIndex === -1) {
            return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
        }

        const archive = archives[archiveIndex];
        if (archive.authorId && archive.authorId !== authorId) {
            return NextResponse.json({ error: 'Unauthorized: Only the author can delete this' }, { status: 403 });
        }

        archives.splice(archiveIndex, 1);
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(archives, null, 2), 'utf8');

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

        if (!fs.existsSync(DATA_FILE_PATH)) {
            return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
        }

        const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
        let archives = JSON.parse(data);
        const archiveIndex = archives.findIndex((a: any) => a.id === id);

        if (archiveIndex === -1) {
            return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
        }

        const archive = archives[archiveIndex];
        if (!archive.likedBy) archive.likedBy = [];

        if (archive.likedBy.includes(userId)) {
            return NextResponse.json({ error: 'Already liked' }, { status: 400 });
        }

        archive.likedBy.push(userId);
        archive.likes = (archive.likes || 0) + 1;

        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(archives, null, 2), 'utf8');

        return NextResponse.json({ success: true, likes: archive.likes });
    } catch (error) {
        console.error('Error liking archive:', error);
        return NextResponse.json({ error: 'Failed to like archive' }, { status: 500 });
    }
}
