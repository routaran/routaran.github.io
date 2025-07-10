import { useState } from "react";
import { X, Plus, Search } from "lucide-react";
import { Label } from "../common/Form";
import { Button } from "../common/Button";
import type { PlayerInsert } from "../../types/database";

interface PlayerSelectorProps {
  players: PlayerInsert[];
  onChange: (players: PlayerInsert[]) => void;
  disabled?: boolean;
  minPlayers?: number;
  maxPlayers?: number;
}

export function PlayerSelector({
  players,
  onChange,
  disabled = false,
  minPlayers = 4,
  maxPlayers = 16,
}: PlayerSelectorProps) {
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter players based on search query
  const filteredPlayers = players.filter(
    (player) =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPlayer = () => {
    setError(null);

    if (!newPlayerName.trim()) {
      setError("Player name is required");
      return;
    }

    if (!newPlayerEmail.trim()) {
      setError("Player email is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newPlayerEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    // Check for duplicate names
    if (
      players.some(
        (p) => p.name.toLowerCase() === newPlayerName.trim().toLowerCase()
      )
    ) {
      setError("A player with this name already exists");
      return;
    }

    // Check for duplicate emails
    if (
      players.some(
        (p) => p.email.toLowerCase() === newPlayerEmail.trim().toLowerCase()
      )
    ) {
      setError("A player with this email already exists");
      return;
    }

    // Check max players
    if (players.length >= maxPlayers) {
      setError(`Maximum ${maxPlayers} players allowed`);
      return;
    }

    const newPlayer: PlayerInsert = {
      name: newPlayerName.trim(),
      email: newPlayerEmail.trim().toLowerCase(),
      play_date_id: "", // Will be set when creating the play date
    };

    onChange([...players, newPlayer]);
    setNewPlayerName("");
    setNewPlayerEmail("");
    setShowAddForm(false);
  };

  const handleRemovePlayer = (index: number) => {
    const updatedPlayers = players.filter((_, i) => i !== index);
    onChange(updatedPlayers);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>
          Players ({players.length}/{maxPlayers})
        </Label>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add between {minPlayers} and {maxPlayers} players for this play date
        </p>
      </div>

      {/* Search bar */}
      {players.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:text-sm"
          />
        </div>
      )}

      {/* Players list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredPlayers.map((player, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {player.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {player.email}
              </p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemovePlayer(index)}
                className="ml-3 p-1 text-gray-400 hover:text-red-600 transition-colors"
                aria-label={`Remove ${player.name}`}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        ))}

        {players.length === 0 && (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400">
            No players added yet
          </p>
        )}
      </div>

      {/* Add player form */}
      {!disabled && (
        <>
          {!showAddForm ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddForm(true)}
              disabled={players.length >= maxPlayers}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          ) : (
            <div className="space-y-3 p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Add New Player
              </h4>

              <div>
                <Label htmlFor="new-player-name">Name</Label>
                <input
                  type="text"
                  id="new-player-name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Player name"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:text-sm"
                />
              </div>

              <div>
                <Label htmlFor="new-player-email">Email</Label>
                <input
                  type="email"
                  id="new-player-email"
                  value={newPlayerEmail}
                  onChange={(e) => setNewPlayerEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:text-sm"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddPlayer}
                  className="flex-1"
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewPlayerName("");
                    setNewPlayerEmail("");
                    setError(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Validation message */}
      {players.length < minPlayers && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Add at least {minPlayers - players.length} more player
          {minPlayers - players.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
