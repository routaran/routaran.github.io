import { supabase } from "../supabase";
import type { Player, PlayerInsert, PlayerUpdate } from "../../types/database";

export async function getPlayers(playDateId?: string) {
  const query = supabase.from("players").select("*").order("name");

  if (playDateId) {
    query.eq("play_date_id", playDateId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getPlayerById(id: string) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createPlayer(player: PlayerInsert) {
  const { data, error } = await supabase
    .from("players")
    .insert(player)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createPlayers(players: PlayerInsert[]) {
  const { data, error } = await supabase
    .from("players")
    .insert(players)
    .select();

  if (error) throw error;
  return data;
}

export async function updatePlayer(id: string, player: PlayerUpdate) {
  const { data, error } = await supabase
    .from("players")
    .update(player)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlayer(id: string) {
  const { error } = await supabase.from("players").delete().eq("id", id);

  if (error) throw error;
}

export async function searchPlayers(query: string, playDateId?: string) {
  const searchQuery = supabase
    .from("players")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(20);

  if (playDateId) {
    searchQuery.eq("play_date_id", playDateId);
  }

  const { data, error } = await searchQuery;

  if (error) throw error;
  return data;
}

export async function getPlayersWithClaims(playDateId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(
      `
      *,
      player_claims (
        player_id,
        auth_user_id,
        claimed_at
      )
    `
    )
    .eq("play_date_id", playDateId)
    .order("name");

  if (error) throw error;
  return data;
}

export async function checkPlayerNameExists(name: string, playDateId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .eq("name", name)
    .eq("play_date_id", playDateId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = Row not found
  return !!data;
}

export async function getProjectOwner() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("project_owner", true)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}
