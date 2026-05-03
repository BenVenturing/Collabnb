import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    // Create a few test conversations
    const conversations = [];

    for (let i = 0; i < 3; i++) {
      const [conversation] = await sql`
        INSERT INTO conversations DEFAULT VALUES
        RETURNING id, created_at
      `;

      // Add participants (user 1 and user 2+i)
      await sql`
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES 
          (${conversation.id}, 1),
          (${conversation.id}, ${2 + i})
      `;

      // Add some messages
      const messages = [
        "Hey! I saw your profile and would love to collaborate on a project.",
        "That sounds great! What did you have in mind?",
        "I'm working on a luxury resort campaign in Bali. Would you be interested?",
      ];

      for (let j = 0; j <= i && j < messages.length; j++) {
        await sql`
          INSERT INTO messages (conversation_id, sender_id, content, sent_at)
          VALUES (
            ${conversation.id}, 
            ${j % 2 === 0 ? 2 + i : 1},
            ${messages[j]},
            NOW() - INTERVAL '${(i + 1) * (j + 1)} hours'
          )
        `;
      }

      conversations.push(conversation);
    }

    return Response.json({
      success: true,
      message: "Sample conversations created",
      conversations,
    });
  } catch (error) {
    console.error("Error creating sample conversations:", error);
    return Response.json(
      { error: "Failed to create sample conversations" },
      { status: 500 },
    );
  }
}
