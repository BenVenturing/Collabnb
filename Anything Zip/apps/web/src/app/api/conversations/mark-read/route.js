import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { conversationId, userId } = await request.json();

    if (!conversationId || !userId) {
      return Response.json(
        { error: "conversationId and userId required" },
        { status: 400 },
      );
    }

    await sql`
      UPDATE conversation_participants
      SET last_read_at = NOW()
      WHERE conversation_id = ${conversationId} AND user_id = ${userId}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    return Response.json(
      { error: "Failed to mark conversation as read" },
      { status: 500 },
    );
  }
}
