import { NextResponse } from 'next/server';
import { query } from '@/server/utils/dbHelper';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings: any = await query(
      `SELECT school_name, address, phone, email, website, logo_url
       FROM school_settings LIMIT 1`
    );
    return NextResponse.json(settings[0] || {});
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching school branding' }, { status: 500 });
  }
}
