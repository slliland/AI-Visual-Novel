import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { prompt: _prompt, choice: _choice } = await request.json();

    // Read the sample XML file
    const filePath = join(process.cwd(), 'public', ' sample.xml');
    const xmlContent = await readFile(filePath, 'utf-8');

    // Create a streaming response
    const stream = new ReadableStream({
      start(controller) {
        // Simulate streaming by sending chunks of the XML
        const chunks = xmlContent.split('');
        let index = 0;

        const sendChunk = () => {
          if (index < chunks.length) {
            // Send 1-3 characters at a time to simulate realistic streaming
            const chunkSize = Math.floor(Math.random() * 3) + 1;
            const chunk = chunks.slice(index, index + chunkSize).join('');
            
            controller.enqueue(new TextEncoder().encode(chunk));
            index += chunkSize;

            // Random delay between 20-80ms to simulate network latency
            setTimeout(sendChunk, Math.floor(Math.random() * 60) + 20);
          } else {
            controller.close();
          }
        };

        // Start streaming after a brief delay
        setTimeout(sendChunk, 100);
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in story API:', error);
    return NextResponse.json(
      { error: 'Failed to generate story' },
      { status: 500 }
    );
  }
}

// Alternative endpoint for different story segments if needed
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const _segment = searchParams.get('segment') || 'intro';

  try {
    // For now, we'll use the same sample XML for all segments
    const filePath = join(process.cwd(), 'public', ' sample.xml');
    const xmlContent = await readFile(filePath, 'utf-8');

    // Create streaming response
    const stream = new ReadableStream({
      start(controller) {
        const chunks = xmlContent.split('');
        let index = 0;

        const sendChunk = () => {
          if (index < chunks.length) {
            const chunkSize = Math.floor(Math.random() * 5) + 1;
            const chunk = chunks.slice(index, index + chunkSize).join('');
            
            controller.enqueue(new TextEncoder().encode(chunk));
            index += chunkSize;

            setTimeout(sendChunk, Math.floor(Math.random() * 50) + 30);
          } else {
            controller.close();
          }
        };

        setTimeout(sendChunk, 50);
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in story API:', error);
    return NextResponse.json(
      { error: 'Failed to load story segment' },
      { status: 500 }
    );
  }
}
