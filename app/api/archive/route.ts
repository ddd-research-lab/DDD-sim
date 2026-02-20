import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'archives.json');
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'archives');

// Ensure directories exist
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

export async function GET() {
    try {
        if (!fs.existsSync(DATA_FILE_PATH)) {
            return NextResponse.json([]);
        }
        const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
        const archives = JSON.parse(data);
        // Sort by date desc
        archives.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Return summary list (exclude heavy history/logs to save bandwidth list view)
        const summary = archives.map((a: any) => ({
            id: a.id,
            nickname: a.nickname,
            initialSetup: a.initialSetup,
            explanation: a.explanation,
            createdAt: a.createdAt,
            imagePath: a.imagePath,
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

        if (image) {
            // Save image
            const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
            const fileName = `${id}.png`;
            const filePath = path.join(IMAGES_DIR, fileName);
            fs.writeFileSync(filePath, buffer);
            imagePath = `/images/archives/${fileName}`;
        }

        const newArchive = {
            id,
            nickname,
            initialSetup,
            explanation,
            history,
            logs,
            imagePath,
            createdAt,
            authorId: authorId || '', // Store the user ID of the creator
            likes: 0,
            likedBy: []
        };

        let archives = [];
        if (fs.existsSync(DATA_FILE_PATH)) {
            const fileData = fs.readFileSync(DATA_FILE_PATH, 'utf8');
            archives = JSON.parse(fileData);
        }

        archives.push(newArchive);
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(archives, null, 2));

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error('Error saving archive:', error);
        return NextResponse.json({
            error: 'Failed to save archive',
            details: error.message
        }, { status: 500 });
    }
}
