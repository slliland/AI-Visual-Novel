import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { CreateConversationRequest } from '../../lib/database-types';

// GET /api/conversations - Get all conversations for a user session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userSession = searchParams.get('userSession');

    if (!userSession) {
      return NextResponse.json(
        { error: 'User session is required' },
        { status: 400 }
      );
    }

    // Get all conversations for the user
    const conversationsResult = await sql`
      SELECT id, title, initial_prompt, created_at, updated_at
      FROM conversations 
      WHERE user_session = ${userSession}
      ORDER BY updated_at DESC
    `;

    // Get all segments for all conversations in one query
    const segmentsResult = await sql`
      SELECT s.* 
      FROM story_segments s
      INNER JOIN conversations c ON s.conversation_id = c.id
      WHERE c.user_session = ${userSession}
      ORDER BY s.conversation_id, s.segment_order ASC
    `;

    // Get all choices for all conversations in one query  
    const choicesResult = await sql`
      SELECT ch.* 
      FROM choices ch
      INNER JOIN conversations c ON ch.conversation_id = c.id
      WHERE c.user_session = ${userSession}
      ORDER BY ch.conversation_id, ch.choice_order ASC
    `;

    // Group segments and choices by conversation
    const segmentsByConv: Record<string, Array<{ speaker: string; emotion: string; text: string }>> = {};
    const choicesByConv: Record<string, Array<{ id: string; text: string }>> = {};

    segmentsResult.rows.forEach(segment => {
      if (!segmentsByConv[segment.conversation_id]) {
        segmentsByConv[segment.conversation_id] = [];
      }
      segmentsByConv[segment.conversation_id].push({
        speaker: segment.speaker,
        emotion: segment.emotion,
        text: segment.text,
      });
    });

    choicesResult.rows.forEach(choice => {
      if (!choicesByConv[choice.conversation_id]) {
        choicesByConv[choice.conversation_id] = [];
      }
      choicesByConv[choice.conversation_id].push({
        id: choice.choice_id,
        text: choice.choice_text,
      });
    });

    // Build full conversation objects
    const conversations = conversationsResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      initialPrompt: row.initial_prompt,
      date: new Date(row.created_at),
      segments: segmentsByConv[row.id] || [],
      choices: choicesByConv[row.id] || [],
    }));

    return NextResponse.json({ conversations });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const body: CreateConversationRequest = await request.json();
    const { title, initialPrompt, userSession } = body;

    if (!title || !initialPrompt || !userSession) {
      return NextResponse.json(
        { error: 'Title, initial prompt, and user session are required' },
        { status: 400 }
      );
    }

    const conversationId = uuidv4();

    await sql`
      INSERT INTO conversations (id, title, initial_prompt, user_session)
      VALUES (${conversationId}, ${title}, ${initialPrompt}, ${userSession})
    `;

    const result = await sql`
      SELECT * FROM conversations WHERE id = ${conversationId}
    `;

    const conversation = result.rows[0];
    
    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        initial_prompt: conversation.initial_prompt,
        created_at: new Date(conversation.created_at),
        updated_at: new Date(conversation.updated_at),
        user_session: conversation.user_session,
      },
      segments: [],
      choices: [],
      selectedChoices: [],
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
