import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  is_member: boolean;
  is_admin: boolean;
}

export interface Parlay {
  id: string;
  title: string;
  better_id: string;
  status: "open" | "locked";
  created_at: string;
}

export interface PickRow {
  id: string;
  parlay_id: string;
  picker_id: string;
  sport: string;
  event_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  market: string;
  selection: string;
  player: string | null;
  point: number | null;
  price: number;
  bookmaker: string;
  conflict_key: string;
}

// Verified identity (getClaims checks the JWT) plus the caller's profile.
export async function getViewer(): Promise<Profile> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, is_member, is_admin")
    .eq("id", userId)
    .single<Profile>();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const viewer = await getViewer();
  if (!viewer.is_admin) redirect("/");
  return viewer;
}

export async function getCurrentParlay() {
  const supabase = await createClient();
  const { data: parlay } = await supabase
    .from("parlays")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Parlay>();
  if (!parlay) return null;

  const { data: picks } = await supabase
    .from("picks")
    .select("*")
    .eq("parlay_id", parlay.id)
    .order("created_at")
    .returns<PickRow[]>();
  return { parlay, picks: picks ?? [] };
}

export async function getProfiles() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, is_member, is_admin")
    .order("display_name")
    .returns<Profile[]>();
  return data ?? [];
}
