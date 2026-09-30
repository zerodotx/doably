import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/db';
import { ensureDatabase } from '@/db/setup';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const { email } = await request.json();
    const normalized = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    await sql`INSERT INTO subscribers(email) VALUES(${normalized}) ON CONFLICT(email) DO NOTHING`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Subscription is temporarily unavailable.' }, { status: 500 });
  }
}
