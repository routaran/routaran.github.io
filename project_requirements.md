# Pickleball Tracker – Formal Requirements Specification
*Revision 2025‑07‑08 – Supabase‑enabled multi‑user edition*

## 1  Overview
A single‑page web application (SPA) served statically from **GitHub Pages**.
All persistence, authentication and live updates are provided by **Supabase**:

* **Auth** – password‑less "magic‑link" e‑mail login.
* **Database** – Postgres tables (`players`, `matches`, …) protected by Row‑Level‑Security.
* **Realtime** – WebSocket channel that broadcasts row changes so every open browser sees new scores within one second.
* **Optional archive** – The Organizer can still export a JSON snapshot of any Play Date and have the SPA (or a GitHub Action) commit it back to the repo for long‑term, version‑controlled history.

No player needs a GitHub account; the only requirement is an e‑mail address capable of receiving magic‑link messages.

## 2  Actors
| Actor | Description |
|-------|-------------|
| **Organizer** | Creates a Play‑Date, enters courts and player names, regenerates schedules, exports archives. Must log in via magic link like any other player. |
| **Project Owner** | Has the same rights as the Organizer for any Play Date - can modify player lists, regenerate schedules, and export archives. Must log in via magic link like any other player. |
| **Player** | Logs in via magic link, claims their name once, enters scores for the matches they participated in, views live rankings. |
| **Visitor** | Anyone who opens the URL without logging in. Can view schedules, results and rankings in real‑time but cannot modify data. |

## 3  Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **FR‑01** | The system shall allow an Organizer to create a *Play Date* with an ISO date string (YYYY‑MM‑DD). | Must |
| **FR‑02** | The system shall allow the Organizer to specify the *number of courts* (integer ≥ 1) booked for a Play Date. | Must |
| **FR‑03** | The system shall allow the Organizer to create, edit and delete *Players* (name only). Duplicate names are rejected. | Must |
| **FR‑04** | For each Play Date, the system shall generate a **round‑robin schedule** such that each possible doubles pairing is played **with** every partner exactly once and **against** every opposing pair exactly once, **while ensuring every scheduled court contains 2 – 4 unique players.** For odd numbers of players, the system shall generate bye rounds where one partnership sits out each round. | Must |
| **FR‑05** | The system shall persist all Play Date data (players, schedule, scores, rankings) to **Supabase Postgres** and reload it automatically on page refresh or new device. | Must |
| **FR‑06** | The system shall list all scheduled matches with assigned *court numbers* and *round numbers* (chronological order). | Must |
| **FR‑07** | The system shall allow **logged‑in players who are listed in a match (p1 – p4)** to enter that match's score exactly once. A second update is blocked by database Row‑Level‑Security. | Must |
| **FR‑08** | The system shall validate score inputs according to the selected win‑condition (see FR‑16) and reject invalid or duplicate submissions. | Must |
| **FR‑09** | Upon valid score entry, the system shall mark the match as **completed** and update each player's cumulative stats: Games Played, Wins, Losses, Points For, Points Against. | Must |
| **FR‑10** | The system shall calculate *Rankings* with default algorithm **Win % → Point Differential → Head‑to‑Head**, selectable in settings. | Must |
| **FR‑11** | Rankings shall appear in a sortable, responsive table and update automatically when the underlying data changes. | Must |
| **FR‑12** | The system shall allow the Organizer and Project Owner to regenerate the schedule and modify the player list **only before** any scores have been recorded. | Must |
| **FR‑13** | The system shall export any Play Date's full dataset as `YYYY‑MM‑DD.json` and (optionally) commit it to the repo via a service token or GitHub Action. | Should |
| **FR‑14** | The system shall import a previously exported JSON file to restore or review historical data offline. | Should |
| **FR‑15** | The UI shall provide *Dark Mode* and respect the user's OS color‑scheme preference. | Could |
| **FR‑16** | The system shall let the Organizer choose per Play Date: <br> a. **First‑to‑Target** – first side reaching target **T** wins. <br> b. **Win‑by‑2** – play continues until a side has ≥ **T** and leads by ≥ 2. <br>Valid **T** range: 5 – 21 (default = 11). | Must |
| **FR‑17** | The system shall expose a **password‑less login page** where a player selects their name and enters an e‑mail address. Supabase then sends a magic link that creates or resumes the user session. | Must |
| **FR‑18** | On the first successful login, a player shall **claim** their name, binding it to their Supabase `auth.uid()`. Subsequent claim attempts are rejected. | Must |
| **FR‑19** | The system shall use **Supabase Realtime** to push score and schedule updates so that all connected clients reflect changes within one second. | Must |
| **FR‑20** | The system shall prevent conflicting score updates using optimistic locking with a version field, displaying a clear error message if a match was updated by another user since the current user's last data refresh. | Must |
| **FR‑21** | The system shall pre-generate all possible partnerships for enhanced reporting and maintain a materialized view of match results for performance optimization. | Must |
| **FR‑22** | For tournaments with odd numbers of players, the system shall ensure all partnerships play the same number of matches by rotating bye rounds fairly across all partnerships. | Must |

## 4  Non‑Functional Requirements

| ID | Requirement | Category |
|----|-------------|----------|
| **NFR‑01** | Front‑end is static and served from GitHub Pages; remote calls are limited to Supabase Auth, Realtime and Postgres REST endpoints. | Architecture |
| **NFR‑02** | All user inputs are sanitized; Content‑Security‑Policy blocks inline scripts; database RLS rules enforce permissions: Project Owner (full access), Organizer (manage their Play Dates), Player (update own matches), Visitor (read-only). | Security |
| **NFR‑03** | Initial page load ≤ 2 s on a 3 G connection and works on last‑two‑years evergreen browsers. | Performance |
| **NFR‑04** | UI meets WCAG 2.1 AA and is responsive from 320 px mobile to 1440 px desktop. | Usability |
| **NFR‑05** | Codebase follows ESLint Recommended + Security; every exported function is documented with JSDoc/TSDoc. | Maintainability |
| **NFR‑06** | Critical logic (schedule generation, ranking calculation, RLS helper RPCs) has ≥ 90 % unit‑test coverage, executed via GitHub Actions. | Reliability |
| **NFR‑07** | Personal data (e‑mail) is stored only in Supabase; archives committed to GitHub contain names and scores but **not** e‑mail addresses. | Privacy |
| **NFR‑08** | **Realtime propagation** – Score or schedule changes must appear in other clients within ≤ 1 s 95 % of the time. | Performance |
| **NFR‑09** | **Data integrity** – Once `completed = TRUE`, subsequent updates to that match are prevented by the database. | Reliability |
| **NFR‑10** | **Audit logging** – The system shall maintain an audit trail of score edits (who edited, when, old/new values) to aid dispute resolution. Commits/archives provide long-term history. | Accountability |

## 5  Assumptions & Constraints

1. Maximum 4 courts per Play Date.
2. Only round‑robin doubles are in scope; no ladders or elimination brackets.
3. Organizer handles pacing and court timing offline. Court scheduling is managed externally.
4. Each player must provide a valid e‑mail address capable of receiving a magic link.
5. The first user to create a Play Date becomes the Organizer for that Play Date.
6. The Project Owner has administrative rights across all Play Dates regardless of who created them.
7. Supabase free‑tier limits (500 MB storage, 2 GB egress) are sufficient for typical club usage.
8. Player count constraints: minimum 4 players, maximum 16 players per Play Date.
9. Offline usage is out of scope - the application requires an active internet connection.
10. Push notifications are out of scope - all updates happen via in-browser realtime subscriptions.

## 6  Glossary

* **Play Date** – A calendar day containing courts, players and their generated schedule.
* **Match** – A single game to target points between two doubles teams.
* **Row‑Level‑Security (RLS)** – Postgres feature that restricts `SELECT/INSERT/UPDATE` per row based on the logged‑in user.
* **Magic Link** – One‑time URL sent via e‑mail that authenticates and creates a session without a password.
* **Realtime Channel** – Supabase WebSocket feed that delivers database change events to subscribed browsers.
* **Optimistic Locking** – Concurrency control method using version numbers to prevent conflicting updates to the same data.
* **Bye Round** – A round where one partnership sits out when there are odd numbers of players in the tournament.