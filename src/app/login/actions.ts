"use server";

import { redirect } from "next/navigation";
import { fail } from "@/lib/action-helpers";
import { createClient } from "@/lib/supabase/server";

// Email a 6-digit code. Codes work better than magic links on phones, where
// the link often opens in a different browser than the one that asked for it.
export async function sendCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!email) fail("/login", "Enter your email.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // display_name is only applied the first time someone signs up.
    options: { shouldCreateUser: true, data: { display_name: displayName } },
  });
  if (error) fail("/login", error.message);

  redirect(`/login?email=${encodeURIComponent(email)}`);
}

export async function verifyCode(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const token = String(formData.get("token") ?? "").trim();
  const back = `/login?email=${encodeURIComponent(email)}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) fail(back, "That code didn't work. Check it or request a new one.");

  redirect("/");
}
