import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { conversationId, senderId, content } = await request.json();

    if (!conversationId || !senderId || !content) {
      return Response.json(
        { error: "conversationId, senderId, and content required" },
        { status: 400 },
      );
    }

    // Verify sender is a participant
    const [participant] = await sql`
      SELECT id FROM conversation_participants
      WHERE conversation_id = ${conversationId} AND user_id = ${senderId}
    `;

    if (!participant) {
      return Response.json(
        { error: "Sender is not a participant in this conversation" },
        { status: 403 },
      );
    }

    // Insert message
    const [message] = await sql`
      INSERT INTO messages (conversation_id, sender_id, content)
      VALUES (${conversationId}, ${senderId}, ${content})
      RETURNING id, conversation_id, sender_id, content, sent_at
    `;

    return Response.json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    return Response.json({ error: "Failed to send message" }, { status: 500 });
  }
}
