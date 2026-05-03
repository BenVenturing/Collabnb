import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get("userId"));

    if (!userId) {
      return Response.json({ error: "userId required" }, { status: 400 });
    }

    // Get all conversations for this user with latest message
    const conversations = await sql`
      SELECT 
        c.id,
        c.created_at,
        m.content as last_message,
        m.sent_at as last_message_at,
        m.sender_id as last_sender_id,
        cp_other.user_id as other_user_id,
        cp_current.last_read_at,
        CASE 
          WHEN m.sent_at > cp_current.last_read_at AND m.sender_id != ${userId}
          THEN true 
          ELSE false 
        END as has_unread
      FROM conversations c
      INNER JOIN conversation_participants cp_current 
        ON c.id = cp_current.conversation_id AND cp_current.user_id = ${userId}
      LEFT JOIN conversation_participants cp_other 
        ON c.id = cp_other.conversation_id AND cp_other.user_id != ${userId}
      LEFT JOIN LATERAL (
        SELECT content, sent_at, sender_id
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY sent_at DESC
        LIMIT 1
      ) m ON true
      ORDER BY COALESCE(m.sent_at, c.created_at) DESC
    `;

    return Response.json({ conversations });
  } catch (error) {
    console.error("Error listing conversations:", error);
    return Response.json(
      { error: "Failed to list conversations" },
      { status: 500 },
    );
  }
}
