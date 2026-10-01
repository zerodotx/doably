import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { sql } from '@/db';
import { ensureDatabase } from '@/db/setup';
import { isAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabase();
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Please choose an Excel file.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!firstSheet) {
      return NextResponse.json({ error: 'The workbook has no readable sheet.' }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
    if (!rows.length) {
      return NextResponse.json({ error: 'The spreadsheet is empty.' }, { status: 400 });
    }

    const required = [
      'Category',
      'USA Search Keyword - I can do...',
      'Device Needed',
      'Fiverr / Upwork Gig Title',
      'USA Earning Range'
    ];

    const headers = Object.keys(rows[0]);
    const missing = required.filter((key) => !headers.includes(key));
    if (missing.length) {
      return NextResponse.json({
        error: 'Spreadsheet columns do not match the expected Doably format.',
        missing
      }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const name = text(row['Category']);
      if (!name) {
        skipped++;
        continue;
      }

      const slug = slugify(name);
      const searchKeyword = text(row['USA Search Keyword - I can do...']);
      const deviceNeeded = text(row['Device Needed']);
      const gigTitle = text(row['Fiverr / Upwork Gig Title']);
      const earningRange = text(row['USA Earning Range']);

      const description =
        `Use your ${name.toLowerCase()} skills to offer practical services online. Example service: ${gigTitle || name}.`;

      const skillRows = await sql`
        INSERT INTO skills(name, slug, search_keyword, device_needed, gig_title, earning_range)
        VALUES(${name}, ${slug}, ${searchKeyword || null}, ${deviceNeeded || null}, ${gigTitle || null}, ${earningRange || null})
        ON CONFLICT(slug) DO UPDATE SET
          name = EXCLUDED.name,
          search_keyword = EXCLUDED.search_keyword,
          device_needed = EXCLUDED.device_needed,
          gig_title = EXCLUDED.gig_title,
          earning_range = EXCLUDED.earning_range
        RETURNING id
      `;
      const skillId = skillRows[0].id;

      const categoryRows = await sql`
        INSERT INTO categories(name, slug, description)
        VALUES(${name}, ${slug}, ${description})
        ON CONFLICT(slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description
        RETURNING id
      `;
      const categoryId = categoryRows[0].id;

      await sql`
        INSERT INTO skill_categories(skill_id, category_id)
        VALUES(${skillId}, ${categoryId})
        ON CONFLICT DO NOTHING
      `;

      if (searchKeyword) {
        await sql`
          INSERT INTO search_terms(term, skill_id)
          VALUES(${searchKeyword.toLowerCase()}, ${skillId})
          ON CONFLICT(term) DO UPDATE SET skill_id = EXCLUDED.skill_id
        `;
      }

      imported++;
    }

    return NextResponse.json({
      ok: true,
      imported,
      skipped,
      total: rows.length
    });
  } catch (error) {
    console.error('Doably spreadsheet import failed:', error);
    return NextResponse.json({
      error: 'Import failed. Check the spreadsheet format and database connection.'
    }, { status: 500 });
  }
}
