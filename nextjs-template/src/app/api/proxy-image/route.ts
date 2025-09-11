import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { imageUrl } = await req.json();
  if (!imageUrl) return NextResponse.json({ error: 'No imageUrl provided' }, { status: 400 });

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 });
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 