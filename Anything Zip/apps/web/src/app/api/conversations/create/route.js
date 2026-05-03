import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { participantIds } = await request.json();

    if (!participantIds || participantIds.length < 2) {
      return Response.json(
        { error: "At least 2 participants required" },
        { status: 400 },
      );
    }

    // Check if conversation already exists between these users
    const existingConversation = await sql`
      SELECT c.id
      FROM conversations c
      WHERE c.id IN (
        SELECT conversation_id
        FROM conversation_participants
        WHERE user_id = ANY(${participantIds})
        GROUP BY conversation_id
        HAVING COUNT(DISTINCT user_id) = ${participantIds.length}
          AND COUNT(*) = ${participantIds.length}
      )
      LIMIT 1
    `;

    if (existingConversation.length > 0) {
      return Response.json({
        conversationId: existingConversation[0].id,
        existed: true,
      });
    }

    // Create new conversation
    const [conversation] = await sql`
      INSERT INTO conversations DEFAULT VALUES
      RETURNING id, created_at
    `;

    // Add participants
    const participantValues = participantIds.map((userId) => ({
      conversation_id: conversation.id,
      user_id: userId,
    }));

    await sql`
      INSERT INTO conversation_participants ${sql(participantValues)}
    `;

    return Response.json({
      conversationId: conversation.id,
      existed: false,
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return Response.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}
