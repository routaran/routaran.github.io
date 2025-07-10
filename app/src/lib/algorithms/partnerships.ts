/**
 * Partnership generation for doubles pickleball tournaments
 * Generates all unique pairs of players (C(n,2) combinations)
 */

export interface Player {
  id: string;
  name: string;
  email: string;
}

export interface Partnership {
  id: string;
  player1: Player;
  player2: Player;
}

/**
 * Generate all possible partnerships for a given set of players
 * Each partnership is a unique combination of 2 players
 *
 * @param players Array of players (4-16 players)
 * @returns Array of all possible partnerships
 * @throws Error if player count is outside valid range
 */
export function generatePartnerships(players: Player[]): Partnership[] {
  if (players.length < 4) {
    throw new Error("Minimum 4 players required for a tournament");
  }

  if (players.length > 16) {
    throw new Error("Maximum 16 players allowed per tournament");
  }

  const partnerships: Partnership[] = [];

  // Generate all C(n,2) combinations
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const partnership: Partnership = {
        id: `${players[i].id}-${players[j].id}`,
        player1: players[i],
        player2: players[j],
      };
      partnerships.push(partnership);
    }
  }

  return partnerships;
}

/**
 * Get partnership by player IDs
 *
 * @param partnerships Array of all partnerships
 * @param player1Id First player ID
 * @param player2Id Second player ID
 * @returns Partnership if found, null otherwise
 */
export function getPartnership(
  partnerships: Partnership[],
  player1Id: string,
  player2Id: string
): Partnership | null {
  return (
    partnerships.find(
      (p) =>
        (p.player1.id === player1Id && p.player2.id === player2Id) ||
        (p.player1.id === player2Id && p.player2.id === player1Id)
    ) || null
  );
}

/**
 * Get all partnerships containing a specific player
 *
 * @param partnerships Array of all partnerships
 * @param playerId Player ID to search for
 * @returns Array of partnerships containing the player
 */
export function getPartnershipsForPlayer(
  partnerships: Partnership[],
  playerId: string
): Partnership[] {
  return partnerships.filter(
    (p) => p.player1.id === playerId || p.player2.id === playerId
  );
}

/**
 * Validate that partnerships cover all players exactly
 * Each player should appear in exactly (n-1) partnerships
 *
 * @param players Original player array
 * @param partnerships Generated partnerships
 * @returns true if valid, false otherwise
 */
export function validatePartnerships(
  players: Player[],
  partnerships: Partnership[]
): boolean {
  const playerCounts = new Map<string, number>();

  // Count appearances
  partnerships.forEach((p) => {
    playerCounts.set(p.player1.id, (playerCounts.get(p.player1.id) || 0) + 1);
    playerCounts.set(p.player2.id, (playerCounts.get(p.player2.id) || 0) + 1);
  });

  // Each player should appear in exactly (n-1) partnerships
  const expectedCount = players.length - 1;

  for (const player of players) {
    if (playerCounts.get(player.id) !== expectedCount) {
      return false;
    }
  }

  // Total partnerships should be C(n,2) = n*(n-1)/2
  const expectedTotal = (players.length * (players.length - 1)) / 2;
  return partnerships.length === expectedTotal;
}
