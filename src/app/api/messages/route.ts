import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { ValidationError, DatabaseError } from '@/lib/errors'

// GET endpoint for retrieving messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const userId = searchParams.get('userId')
    const userType = searchParams.get('userType') as 'client' | 'accountant'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!conversationId && !userId) {
      const error = new ValidationError('Either conversationId or userId is required')
      logger.error('Messages API validation failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    if (conversationId) {
      // Get messages for a specific conversation
      return await getConversationMessages(conversationId, limit, offset)
    } else {
      // Get conversations for a user
      return await getUserConversations(userId!, userType!, limit, offset)
    }

  } catch (error) {
    logger.error('Messages API service error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error fetching messages' },
      { status: 500 }
    )
  }
}

// POST endpoint for sending messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      conversationId,
      fromUserId,
      fromUserType,
      toUserId,
      toUserType,
      content,
      messageType = 'text',
      priority = 'normal',
      metadata = {}
    } = body

    // Validate required fields
    if (!conversationId || !fromUserId || !fromUserType || !toUserId || !toUserType || !content) {
      const error = new ValidationError('Missing required fields for sending message')
      logger.error('Send message validation failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Verify conversation exists and user has access
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, client_id, accountant_id')
      .eq('id', conversationId)
      .single()

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this conversation
    const hasAccess = (
      (fromUserType === 'client' && conversation.client_id === fromUserId) ||
      (fromUserType === 'accountant' && conversation.accountant_id === fromUserId)
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized access to conversation' },
        { status: 403 }
      )
    }

    // Send the message using the database function
    const { data: messageId, error: sendError } = await supabase
      .rpc('send_message', {
        p_conversation_id: conversationId,
        p_from_user_id: fromUserId,
        p_from_user_type: fromUserType,
        p_to_user_id: toUserId,
        p_to_user_type: toUserType,
        p_content: content,
        p_message_type: messageType,
        p_priority: priority,
        p_metadata: metadata
      })

    if (sendError) {
      const error = new DatabaseError('Failed to send message', {
        dbError: sendError.message
      })
      logger.error('Database error sending message', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Get the sent message details
    const { data: sentMessage, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        sent_at,
        message_type,
        priority,
        metadata
      `)
      .eq('id', messageId)
      .single()

    if (messageError) {
      logger.error('Error fetching sent message details', messageError)
    }

    logger.info('Message sent successfully', {
      messageId,
      conversationId,
      fromUserId,
      toUserId
    })

    return NextResponse.json({
      success: true,
      message: sentMessage || { id: messageId },
      messageId
    })

  } catch (error) {
    logger.error('Send message service error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error sending message' },
      { status: 500 }
    )
  }
}

// PUT endpoint for marking messages as read
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, userType, conversationId, messageIds } = body

    if (action !== 'mark_as_read') {
      return NextResponse.json(
        { error: 'Unknown action' },
        { status: 400 }
      )
    }

    if (!userId || !userType) {
      const error = new ValidationError('Missing userId or userType')
      logger.error('Mark as read validation failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    // Mark messages as read using the database function
    const { data: updatedCount, error: markError } = await supabase
      .rpc('mark_messages_as_read', {
        p_user_id: userId,
        p_user_type: userType,
        p_conversation_id: conversationId || null,
        p_message_ids: messageIds || null
      })

    if (markError) {
      const error = new DatabaseError('Failed to mark messages as read', {
        dbError: markError.message
      })
      logger.error('Database error marking messages as read', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    logger.info('Messages marked as read', {
      userId,
      userType,
      conversationId,
      messageIds,
      updatedCount
    })

    return NextResponse.json({
      success: true,
      updatedCount
    })

  } catch (error) {
    logger.error('Mark as read service error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error marking messages as read' },
      { status: 500 }
    )
  }
}

/**
 * Get messages for a specific conversation
 */
async function getConversationMessages(
  conversationId: string,
  limit: number,
  offset: number
) {
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select(`
      id,
      from_user_id,
      from_user_type,
      to_user_id,
      to_user_type,
      content,
      message_type,
      priority,
      sent_at,
      read_at,
      is_read,
      metadata,
      message_attachments (
        id,
        file_name,
        file_path,
        file_size,
        mime_type,
        metadata
      )
    `)
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('sent_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (messagesError) {
    const error = new DatabaseError('Failed to fetch conversation messages', {
      conversationId,
      dbError: messagesError.message
    })
    logger.error('Database error fetching messages', error)
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  // Format messages for frontend
  const formattedMessages = messages?.map(message => ({
    id: message.id,
    from: message.from_user_type,
    fromName: message.from_user_type === 'client' ? 'You' : 'Accountant', // TODO: Get actual names
    message: message.content,
    timestamp: message.sent_at,
    read: message.is_read,
    type: message.message_type,
    attachments: message.message_attachments?.map((attachment: any) => ({
      id: attachment.id,
      name: attachment.file_name,
      url: attachment.file_path, // TODO: Generate signed URL
      type: attachment.mime_type,
      size: attachment.file_size
    })) || [],
    metadata: message.metadata
  })) || []

  return NextResponse.json({
    success: true,
    messages: formattedMessages,
    total: formattedMessages.length,
    hasMore: formattedMessages.length === limit
  })
}

/**
 * Get conversations for a specific user
 */
async function getUserConversations(
  userId: string,
  userType: 'client' | 'accountant',
  limit: number,
  offset: number
) {
  let query = supabase
    .from('conversations')
    .select(`
      id,
      client_id,
      accountant_id,
      created_at,
      updated_at,
      last_message_at,
      last_message_preview,
      is_archived,
      client:clients!inner(
        id,
        name,
        email
      ),
      accountant:accountants!inner(
        id,
        name,
        email
      )
    `)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Filter by user type
  if (userType === 'client') {
    query = query.eq('client_id', userId)
  } else {
    query = query.eq('accountant_id', userId)
  }

  const { data: conversations, error: conversationsError } = await query

  if (conversationsError) {
    const error = new DatabaseError('Failed to fetch user conversations', {
      userId,
      userType,
      dbError: conversationsError.message
    })
    logger.error('Database error fetching conversations', error)
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  // Get unread message counts for each conversation
  const conversationIds = conversations?.map(c => c.id) || []
  const { data: unreadCounts, error: unreadError } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .eq('to_user_id', userId)
    .eq('to_user_type', userType)
    .eq('is_read', false)
    .eq('is_deleted', false)

  if (unreadError) {
    logger.error('Error fetching unread counts', unreadError)
  }

  // Count unread messages per conversation
  const unreadCountMap = (unreadCounts || []).reduce((acc: Record<string, number>, msg: any) => {
    acc[msg.conversation_id] = (acc[msg.conversation_id] || 0) + 1
    return acc
  }, {})

  // Format conversations for frontend
  const formattedConversations = conversations?.map(conversation => {
    const otherParticipant = userType === 'client' 
      ? conversation.accountant 
      : conversation.client

    return {
      id: conversation.id,
      participant: {
        id: otherParticipant.id,
        name: otherParticipant.name,
        email: otherParticipant.email,
        role: userType === 'client' ? 'accountant' : 'client',
        status: 'offline' // TODO: Implement real-time presence
      },
      lastMessage: {
        preview: conversation.last_message_preview,
        timestamp: conversation.last_message_at
      },
      unreadCount: unreadCountMap[conversation.id] || 0,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at
    }
  }) || []

  return NextResponse.json({
    success: true,
    conversations: formattedConversations,
    total: formattedConversations.length,
    hasMore: formattedConversations.length === limit
  })
}