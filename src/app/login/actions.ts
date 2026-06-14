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
    return { success: true };
  }

  return { success: false, error: "Invalid username or password" };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
}

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  return token || null;
}
