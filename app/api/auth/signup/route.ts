import { NextResponse } from "next/server";
import { hash } from "bcrypt-ts";
import { db } from "@/lib/db";
import { ensureUserRoles } from "@/lib/services/bootstrap";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = signupSchema.parse(body);

    // 1. Check if user already exists (from Google or previous manual signup)
    const existingUser = await db.user.findUnique({ where: { email } });

    if (existingUser) {
      // If they exist but have no passwordHash, they used Google originally.
      if (!existingUser.passwordHash) {
        return NextResponse.json({ error: "Account exists via Google. Please sign in with Google." }, { status: 409 });
      }
      return NextResponse.json({ error: "Account with this email already exists." }, { status: 409 });
    }

    // 2. Hash password and create the user.
    const passwordHash = await hash(password, 12);

    const user = await db.user.create({
      data: { name, email, passwordHash },
    });

    // 3. Assign PARTICIPANT by default, and SUPER_ADMIN if email is listed
    // in SUPER_ADMIN_EMAILS. Roles are stored in UserRole, not User.role.
    await ensureUserRoles(user);

    return NextResponse.json({ message: "User created successfully" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
