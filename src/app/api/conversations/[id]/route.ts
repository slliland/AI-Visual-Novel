import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { UpdateConversationRequest, ConversationResponse } from '../../../lib/database-types';

// GET /api/conversations/[id] - Get a specific conversation with all its data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = id;
    const { searchParams } = new URL(request.url);
    const userSession = searchParams.get('userSession');

    if (!userSession) {
      return NextResponse.json(
        { error: 'User session is required' },
        { status: 400 }
      );
    }

    // Check if database is available
    if (!process.env.POSTGRES_URL) {
      console.log('⚠️ No database connection available, returning 404 for conversation');
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get conversation
    const conversationResult = await sql`
      SELECT * FROM conversations 
      WHERE id = ${conversationId} AND user_session = ${userSession}
    `;

    if (conversationResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get segments
    const segmentsResult = await sql`
      SELECT * FROM story_segments 
      WHERE conversation_id = ${conversationId}
      ORDER BY segment_order ASC
    `;

    // Get choices
    const choicesResult = await sql`
      SELECT * FROM choices 
      WHERE conversation_id = ${conversationId}
      ORDER BY choice_order ASC
    `;

    // Get selected choices
    const selectedChoicesResult = await sql`
      SELECT * FROM selected_choices 
      WHERE conversation_id = ${conversationId}
      ORDER BY selected_at ASC
    `;

    const conversation = conversationResult.rows[0];
    
    const response: ConversationResponse = {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        initial_prompt: conversation.initial_prompt,
        created_at: new Date(conversation.created_at),
        updated_at: new Date(conversation.updated_at),
        user_session: conversation.user_session,
      },
      segments: segmentsResult.rows.map(row => ({
        id: row.id,
        conversation_id: row.conversation_id,
        speaker: row.speaker,
        emotion: row.emotion,
        text: row.text,
        segment_order: row.segment_order,
        created_at: new Date(row.created_at),
      })),
      choices: choicesResult.rows.map(row => ({
        id: row.id,
        conversation_id: row.conversation_id,
        choice_id: row.choice_id,
        choice_text: row.choice_text,
        choice_order: row.choice_order,
        created_at: new Date(row.created_at),
      })),
      selectedChoices: selectedChoicesResult.rows.map(row => ({
        id: row.id,
        conversation_id: row.conversation_id,
        choice_id: row.choice_id,
        selected_at: new Date(row.selected_at),
      })),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// PUT /api/conversations/[id] - Update conversation with new segments/choices
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = id;
    const { searchParams } = new URL(request.url);
    const userSession = searchParams.get('userSession');
    const body: UpdateConversationRequest = await request.json();

    if (!userSession) {
      return NextResponse.json(
        { error: 'User session is required' },
        { status: 400 }
      );
    }

    // Verify conversation exists and belongs to user
    const conversationResult = await sql`
      SELECT * FROM conversations 
      WHERE id = ${conversationId} AND user_session = ${userSession}
    `;

    if (conversationResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Update segments if provided
    if (body.segments && body.segments.length > 0) {
      // Get current segment count for ordering
      const segmentCountResult = await sql`
        SELECT COALESCE(MAX(segment_order), 0) as max_order 
        FROM story_segments 
        WHERE conversation_id = ${conversationId}
      `;
      
      let currentOrder = segmentCountResult.rows[0].max_order + 1;

      // Insert new segments
      for (const segment of body.segments) {
        await sql`
          INSERT INTO story_segments (id, conversation_id, speaker, emotion, text, segment_order)
          VALUES (${uuidv4()}, ${conversationId}, ${segment.speaker}, ${segment.emotion}, ${segment.text}, ${currentOrder})
        `;
        currentOrder++;
      }
    }

    // Update choices if provided
    if (body.choices && body.choices.length > 0) {
      // Clear existing choices for this conversation
      await sql`DELETE FROM choices WHERE conversation_id = ${conversationId}`;

      // Insert new choices
      for (let i = 0; i < body.choices.length; i++) {
        const choice = body.choices[i];
        await sql`
          INSERT INTO choices (id, conversation_id, choice_id, choice_text, choice_order)
          VALUES (${uuidv4()}, ${conversationId}, ${choice.id}, ${choice.text}, ${i})
        `;
      }
    }

    // Record selected choice if provided
    if (body.selectedChoiceId) {
      // Find the choice in the database
      const choiceResult = await sql`
        SELECT id FROM choices 
        WHERE conversation_id = ${conversationId} AND choice_id = ${body.selectedChoiceId}
      `;

      if (choiceResult.rows.length > 0) {
        await sql`
          INSERT INTO selected_choices (id, conversation_id, choice_id)
          VALUES (${uuidv4()}, ${conversationId}, ${choiceResult.rows[0].id})
        `;
      }
    }

    // Update conversation timestamp
    await sql`
      UPDATE conversations 
      SET updated_at = NOW() 
      WHERE id = ${conversationId}
    `;

    // Return updated conversation data
    return GET(request, { params: Promise.resolve({ id: conversationId }) });

  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete a conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = id;
    const { searchParams } = new URL(request.url);
    const userSession = searchParams.get('userSession');

    console.log('🗑️ DELETE request received:');
    console.log('🗑️ Conversation ID:', conversationId, 'Type:', typeof conversationId, 'Length:', conversationId.length);
    console.log('🗑️ User session:', userSession, 'Type:', typeof userSession, 'Length:', userSession?.length);
    console.log('🗑️ Full URL:', request.url);

    if (!userSession) {
      console.log('🗑️ ERROR: No user session provided');
      return NextResponse.json(
        { error: 'User session is required' },
        { status: 400 }
      );
    }

    // Verify conversation exists and belongs to user first
    console.log('🗑️ Running query: SELECT id FROM conversations WHERE id = ? AND user_session = ?');
    console.log('🗑️ Query params:', { conversationId, userSession });
    
    const conversationResult = await sql`
      SELECT id, title FROM conversations 
      WHERE id = ${conversationId} AND user_session = ${userSession}
    `;

    console.log('🗑️ Conversation query result:', conversationResult.rows.length, 'rows');
    if (conversationResult.rows.length > 0) {
      console.log('🗑️ Found conversation:', conversationResult.rows[0]);
    }

    if (conversationResult.rows.length === 0) {
      // Let's see what conversations actually exist for this user
      const allUserConversations = await sql`
        SELECT id, title, created_at FROM conversations 
        WHERE user_session = ${userSession}
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      console.log('🗑️ All conversations for user (first 10):');
      allUserConversations.rows.forEach((row, index) => {
        console.log(`🗑️   ${index + 1}. ID: "${row.id}" Title: "${row.title}"`);
        console.log(`🗑️      ID match check: "${row.id}" === "${conversationId}" = ${row.id === conversationId}`);
      });
      
      console.log('🗑️ Looking for conversation ID:', `"${conversationId}"`);
      console.log('🗑️ ERROR: Conversation not found');
      
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Manually delete related records first (in case CASCADE doesn't work)
    await sql`DELETE FROM selected_choices WHERE conversation_id = ${conversationId}`;
    await sql`DELETE FROM choices WHERE conversation_id = ${conversationId}`;
    await sql`DELETE FROM story_segments WHERE conversation_id = ${conversationId}`;
    
    // Now delete the conversation
    const result = await sql`
      DELETE FROM conversations 
      WHERE id = ${conversationId} AND user_session = ${userSession}
    `;

    console.log('Deleted conversation:', conversationId, 'Rows affected:', result.rowCount);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
