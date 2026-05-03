import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = parseInt(searchParams.get("conversationId"));
    const limit = parseInt(searchParams.get("limit")) || 50;

    if (!conversationId) {
      return Response.json(
        { error: "conversationId required" },
        { status: 400 },
      );
    }

    const messages = await sql`
      SELECT id, conversation_id, sender_id, content, sent_at
      FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY sent_at DESC
      LIMIT ${limit}
    `;

    return Response.json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Error listing messages:", error);
    return Response.json({ error: "Failed to list messages" }, { status: 500 });
  }
}
