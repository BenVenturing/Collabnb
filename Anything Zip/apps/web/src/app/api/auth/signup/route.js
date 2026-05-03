import argon2 from "argon2";
import { encode } from "@auth/core/jwt";
import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validation BEFORE any DB operations
    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Ensure values are properly trimmed strings
    const emailStr = String(email).trim();
    const passwordStr = String(password).trim();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Password validation - minimum 8 characters
    if (passwordStr.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Check if user already exists BEFORE transaction
    const existingUserResult = await sql`
      SELECT id FROM auth_users WHERE email = ${emailStr}
    `;

    if (existingUserResult.length > 0) {
      return Response.json({ error: "User already exists" }, { status: 409 });
    }

    // Hash password BEFORE transaction (can fail independently)
    let hashedPassword;
    try {
      hashedPassword = await argon2.hash(passwordStr);
    } catch (hashError) {
      console.error("Password hashing failed:", hashError);
      return Response.json(
        { error: "Password hashing failed" },
        { status: 500 },
      );
    }

    // ATOMIC TRANSACTION: All DB writes succeed or all fail
    const result = await sql.transaction(async (txn) => {
      // 1. Create user
      const createUserResult = await txn`
        INSERT INTO auth_users (name, email, "emailVerified", image)
        VALUES (${name || null}, ${emailStr}, ${null}, ${null})
        RETURNING id, name, email, "emailVerified", image
      `;

      const newUser = createUserResult[0];

      // 2. Create auth account with hashed password
      await txn`
        INSERT INTO auth_accounts
        ("userId", provider, type, "providerAccountId", password)
        VALUES (
          ${newUser.id},
          ${"credentials"},
          ${"credentials"},
          ${newUser.id.toString()},
          ${hashedPassword}
        )
      `;

      // 3. Create session
      const sessionToken = crypto.randomUUID();
      const expires = new Date();
      expires.setDate(expires.getDate() + 30); // 30 days

      await txn`
        INSERT INTO auth_sessions ("userId", expires, "sessionToken")
        VALUES (${newUser.id}, ${expires}, ${sessionToken})
      `;

      return newUser;
    });

    // Transaction succeeded - create JWT token
    const jwt = await encode({
      token: {
        sub: result.id.toString(),
        email: result.email,
        name: result.name,
      },
      secret: process.env.AUTH_SECRET,
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });

    return Response.json({
      jwt,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return Response.json(
      { error: `Signup failed: ${error.message}` },
      { status: 500 },
    );
  }
}
