import { useState, useEffect, useRef, useMemo } from "react";
import { X, Plus, Search } from "lucide-react";
import { Label } from "../common/Form";
import { Button } from "../common/Button";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { searchPlayers } from "../../lib/supabase/players";
import { debounce } from "../../lib/utils";
import { cn } from "../../lib/utils";
import type { PlayerInsert, Player } from "../../types/database";

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
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isEmailAutoFilled, setIsEmailAutoFilled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Create debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (query.length < 2) {
          setSearchResults([]);
          setShowDropdown(false);
          return;
        }

        setIsSearching(true);
        try {
          const results = await searchPlayers(query);
          // Filter out already selected players
          const availableResults = results.filter(
            (player) => !players.some((p) => p.email === player.email)
          );
          setSearchResults(availableResults);
          setShowDropdown(availableResults.length > 0);
        } catch (error) {
          console.error("Player search failed:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300),
    [players]
  );

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNameChange = (value: string) => {
    setNewPlayerName(value);

    // Clear email if it was auto-filled from a previous selection
    if (isEmailAutoFilled) {
      setNewPlayerEmail("");
      setIsEmailAutoFilled(false);
    }

    // Reset selected index
    setSelectedIndex(-1);

    // Trigger search
    debouncedSearch(value);
  };

  const handleEmailChange = (value: string) => {
    setNewPlayerEmail(value);
    setIsEmailAutoFilled(false); // User manually entered/edited email
  };

  const handleSuggestionSelect = (player: Player) => {
    setNewPlayerName(player.name);
    setNewPlayerEmail(player.email);
    setIsEmailAutoFilled(true);
    setShowDropdown(false);
    setSearchResults([]);

    // Focus email field for review/confirmation
    emailInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(searchResults[selectedIndex]);
        } else if (newPlayerName && newPlayerEmail) {
          handleAddPlayer();
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  };

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

    // Email validation regex from database constraint
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
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
    };

    onChange([...players, newPlayer]);
    setNewPlayerName("");
    setNewPlayerEmail("");
    setIsEmailAutoFilled(false);
    setIsAddingPlayer(false);
  };

  const handleCancel = () => {
    setNewPlayerName("");
    setNewPlayerEmail("");
    setIsEmailAutoFilled(false);
    setIsAddingPlayer(false);
    setShowDropdown(false);
    setSearchResults([]);
    setError(null);
  };

  const handleRemovePlayer = (index: number) => {
    const playerToRemove = players[index];
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

      {/* Players list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {players.map((player, index) => (
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
          {!isAddingPlayer ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddingPlayer(true)}
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

              {/* Name field with autocomplete */}
              <div className="relative" ref={dropdownRef}>
                <Label htmlFor="player-name">Name</Label>
                <input
                  id="player-name"
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() =>
                    newPlayerName.length >= 2 && setShowDropdown(true)
                  }
                  placeholder="Start typing player name..."
                  autoComplete="off"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:text-sm"
                />

                {/* Dropdown suggestions */}
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                    {isSearching ? (
                      <div className="p-3 text-center">
                        <LoadingSpinner size="sm" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((player, index) => (
                        <button
                          key={player.id}
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700",
                            selectedIndex === index &&
                              "bg-gray-100 dark:bg-gray-700"
                          )}
                          onClick={() => handleSuggestionSelect(player)}
                        >
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {player.email}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                        No existing players found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Email field */}
              <div>
                <Label htmlFor="player-email">Email</Label>
                <input
                  ref={emailInputRef}
                  id="player-email"
                  type="email"
                  value={newPlayerEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="player@example.com"
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:text-sm",
                    isEmailAutoFilled && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                />
                {isEmailAutoFilled && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Auto-filled from existing player
                  </p>
                )}
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
                  onClick={handleCancel}
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
