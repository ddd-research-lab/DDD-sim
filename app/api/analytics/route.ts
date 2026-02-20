import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ANALYTICS_FILE_PATH = path.join(process.cwd(), 'data', 'analytics.json');

// Initialize data if not exists
function ensureFile() {
    if (!fs.existsSync(ANALYTICS_FILE_PATH)) {
        const initialData = {
            total: 0,
            daily: {} // { "YYYY-MM-DD": count }
        };
        fs.writeFileSync(ANALYTICS_FILE_PATH, JSON.stringify(initialData, null, 2));
    }
}

export async function GET() {
    try {
        ensureFile();
        const data = fs.readFileSync(ANALYTICS_FILE_PATH, 'utf8');
        const analytics = JSON.parse(data);
        const today = new Date().toISOString().split('T')[0];

        return NextResponse.json({
            total: analytics.total || 0,
            daily: analytics.daily[today] || 0
        });
    } catch (error) {
        console.error('Error reading analytics:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST() {
    try {
        ensureFile();
        const data = fs.readFileSync(ANALYTICS_FILE_PATH, 'utf8');
        const analytics = JSON.parse(data);
        const today = new Date().toISOString().split('T')[0];

        // Increment total
        analytics.total = (analytics.total || 0) + 1;

        // Increment daily
        if (!analytics.daily) analytics.daily = {};
        analytics.daily[today] = (analytics.daily[today] || 0) + 1;

        // Optional: Clean up old daily data (keep last 30 days)
        const dates = Object.keys(analytics.daily).sort();
        if (dates.length > 30) {
            delete analytics.daily[dates[0]];
        }

        fs.writeFileSync(ANALYTICS_FILE_PATH, JSON.stringify(analytics, null, 2));

        return NextResponse.json({
            total: analytics.total,
            daily: analytics.daily[today]
        });
    } catch (error) {
        console.error('Error updating analytics:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
