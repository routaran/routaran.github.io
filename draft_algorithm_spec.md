# Round-Robin Scheduling Algorithm Specification

## Overview

This algorithm generates a round-robin schedule for doubles matches in a pickleball tournament. It ensures that:

1. Each player partners with every other player exactly once.
2. Each partnership plays against every other valid partnership (no overlapping players) exactly once.
3. Matches are distributed across a maximum of 4 courts.
4. Bye rounds are rotated fairly for odd player counts.

## Inputs

- **Players**: List of player names (minimum 4, maximum 16).
- **Courts**: Number of courts available (integer ≥ 1, maximum 4).
- **Win Condition**:
    - **Type**: `"first-to-target"` or `"win-by-2"`
    - **Target Points**: Integer between 5–21
- **Date**: ISO date string (YYYY-MM-DD).

## Outputs

- **Schedule**: List of matches with assigned court numbers and round numbers.
- **Bye Rounds**: For odd player counts, a fair rotation of byes so each player sits out as evenly as possible.

---

## Algorithm Steps

### 1. Partnership Generation

1. Calculate all possible doubles partnerships using combinations:
    - Total partnerships = `C(n, 2)` where `n` is the number of players.
2. Store partnerships in a list for scheduling.

---

### 2. Match Scheduling

1. Generate all valid matches:
    - For every unique group of 4 players, generate all unique splits into two teams of 2 (partnerships).
    - For each group of 4, there are 3 unique matches (since `C(4,2)/2 = 3`).
    - Total matches = `C(n,4) * 3`
2. Ensure that no player is scheduled for multiple matches in the same round.
3. Divide matches into rounds, each round containing as many matches as there are courts (or fewer if not enough matches remain).

---

### 3. Bye Round Rotation

1. For odd player counts:
    - Each round, one player (and their possible partnerships) must sit out.
    - Distribute byes as evenly as possible among all players.
    - The number of rounds is determined by the total number of matches and available courts.
2. Ensure all players/partnerships play as close to the same number of matches as possible.

---

### 4. Court Assignment Optimization

1. Assign matches to courts per round:
    - Maximize court utilization (2–4 players per court).
    - Minimize wait times for players between rounds.
2. Ensure court assignments are balanced across rounds.

---

### 5. Edge Case Handling

1. **Minimum Players (4)**:
    - Generate a single round-robin schedule with no bye rounds.
2. **Maximum Players (16)**:
    - Ensure court assignments do not exceed 4 courts.
3. **Odd Player Counts**:
    - Rotate byes fairly across all players.

---

## Example Scenarios

### Example 1: 8 Players

- Partnerships: `C(8, 2) = 28`
- Matches: `C(8,4) * 3 = 70 * 3 = 210`
- Courts: 4
- Schedule: Divide matches into rounds with balanced court assignments.

### Example 2: 12 Players

- Partnerships: `C(12, 2) = 66`
- Matches: `C(12,4) * 3 = 495 * 3 = 1485`
- Courts: 4
- Bye Rounds: Rotate byes across players.

### Example 3: 15 Players

- Partnerships: `C(15, 2) = 105`
- Matches: `C(15,4) * 3 = 1365 * 3 = 4095`
- Courts: 4
- Bye Rounds: Rotate byes across players.

---

## Constraints

1. Maximum 4 courts per Play Date.
2. Minimum 4 players, maximum 16 players.
3. Matches must fit within available courts without overlapping players.

---

## Notes

- Ensure the algorithm is efficient for large player counts.
- Optimize for fairness and minimize player idle time.
- Test edge cases thoroughly (e.g., odd player counts, maximum courts).
