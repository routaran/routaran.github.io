import { supabase } from "../supabase";
import type { Player, PlayerInsert, PlayerUpdate } from "../../types/database";

export async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name");

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
  // Since players are global and have unique email constraint,
  // we need to handle the case where players already exist
  const createdPlayers: Player[] = [];

  for (const player of players) {
    // Try to create the player
    const { data, error } = await supabase
      .from("players")
      .insert(player)
      .select()
      .single();

    if (error) {
      // If player already exists (unique constraint violation), fetch the existing player
      if (error.code === "23505") {
        // Unique constraint violation
        const { data: existingPlayer, error: fetchError } = await supabase
          .from("players")
          .select("*")
          .eq("email", player.email)
          .single();

        if (fetchError) throw fetchError;
        if (existingPlayer) {
          createdPlayers.push(existingPlayer);
        }
      } else {
        throw error;
      }
    } else if (data) {
      createdPlayers.push(data);
    }
  }

  return createdPlayers;
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

export async function searchPlayers(query: string) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(20);

  if (error) throw error;
  return data;
}

export async function getPlayersWithClaims() {
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
    .order("name");

  if (error) throw error;
  return data;
}

export async function getPlayersForPlayDate(playDateId: string) {
  // Get players through partnerships table
  const { data: partnerships, error } = await supabase
    .from("partnerships")
    .select(
      `
      player1:players!partnerships_player1_id_fkey (
        id,
        name,
        email,
        is_project_owner
      ),
      player2:players!partnerships_player2_id_fkey (
        id,
        name,
        email,
        is_project_owner
      )
    `
    )
    .eq("play_date_id", playDateId);

  if (error) throw error;

  // Extract unique players from partnerships
  const playersMap = new Map();
  partnerships?.forEach((partnership) => {
    if (partnership.player1) {
      playersMap.set(partnership.player1.id, partnership.player1);
    }
    if (partnership.player2) {
      playersMap.set(partnership.player2.id, partnership.player2);
    }
  });

  return Array.from(playersMap.values());
}

export async function checkPlayerNameExists(name: string, playDateId: string) {
  // Players are global entities, so we only check if the name exists globally
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .eq("name", name)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = Row not found
  return !!data;
}

export async function getProjectOwner() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_project_owner", true)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}
