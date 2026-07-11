"use server";

import { cookies } from "next/headers";

const ALLOWED_USERS = {
  sanjay: "skandha",
  skandha: "edutech"
};

export async function login(username: string, password: string) {
  const normalizedUsername = username.toLowerCase().trim();
  const normalizedPassword = password.trim();
  
  if (
    normalizedUsername in ALLOWED_USERS && 
    ALLOWED_USERS[normalizedUsername as keyof typeof ALLOWED_USERS] === normalizedPassword
  ) {
    const cookieStore = await cookies();
    cookieStore.set("auth_token", normalizedUsername, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    
    // Set role cookie
    const role = normalizedUsername === 'sanjay' ? 'Admin' : 'Counselor';
    cookieStore.set("user_role", role, {
      httpOnly: false, // allow frontend to read if needed, though we will use server action
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return { success: true };
  }

  // Database verification
  try {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://127.0.0.1:5000' 
      : 'https://acadflow-backend-vrg7.onrender.com';
      
    const res = await fetch(`${baseUrl}/server-api/counselors/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: normalizedUsername, password: normalizedPassword })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        const cookieStore = await cookies();
        cookieStore.set("auth_token", data.user.email, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24,
          path: "/",
        });
        
        cookieStore.set("user_role", data.user.role, {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24,
          path: "/",
        });

        cookieStore.set("counselor_id", data.user.id, {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24,
          path: "/",
        });

        return { success: true };
      }
    }
  } catch (err) {
    console.error("Login API error:", err);
  }

  return { success: false, error: "Invalid username or password" };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  cookieStore.delete("user_role");
  cookieStore.delete("counselor_id");
}

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  return token || null;
}

export async function getUserRole() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  return role || "Counselor"; // Default to Counselor if not set
}

export async function getCounselorId() {
  const cookieStore = await cookies();
  const id = cookieStore.get("counselor_id")?.value;
  return id || null;
}
