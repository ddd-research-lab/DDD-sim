import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL', { status: 400 });
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch image');

        const blob = await response.blob();
        const headers = new Headers();
        // Allow html2canvas to access this image
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Content-Type', response.headers.get('Content-Type') || 'image/png');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new NextResponse(blob, { headers });
    } catch (error) {
        console.error('Proxy Error:', error);
        return new NextResponse('Error fetching image', { status: 500 });
    }
}
