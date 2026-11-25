# CHAOS — Game Rules & State Machines

## 1. Classic Truth or Dare (`truth-dare`)
- **Players**: 2–16
- **Phases**: `choosing-type` → `performing` → `round-summary` → `finished`
- **Scoring**: Truth = +10 pts, Dare = +15 pts, Skip/Pass = 0 pts (optional, host-configurable).
- **Safety**: Players can always Skip (up to `maxSkips`) or Pass. Player-submitted prompts pass through safety filtering and optional host approval.

## 2. King's Truth or Dare (`kings-game`)
- **Players**: 3–16
- **Phases**: `king-announced` → `king-assigning` → `revealing` → `finished`
- **Flow**: Every player receives a unique shuffled number. The server crowns one King (with optional no-consecutive-king rule). Only the King sees the private assignment panel and writes a Truth or Dare for each numbered player. Assignments are revealed one-by-one.

## 3. Who Said That? (`who-said-that`)
- **Players**: 3–16
- **Phases**: `submitting` → `guessing` → `reveal` → `finished`
- **Flow**: Players submit up to 2 anonymous statements. The server shuffles all statements before guessing. Players vote on who wrote each statement.
- **Scoring**: +100 pts per correct guess; +50 pts bonus to the author if no one guessed them.

## 4. Additional Party Games
- **Most Likely To**: Vote on a player matching the prompt (+25 pts to the winner).
- **Never Have I Ever**: Vote *I have* or *I have never* and view live percentages.
- **Would You Rather**: Vote between two options and view live split.
- **Hot Takes**: Vote *Agree*, *Disagree*, or *Unsure*.
- **Two Truths & A Lie**: Storyteller submits 3 statements; others vote on the lie (+100 pts for correct detection).
- **Quick Quiz**: Timed multiple-choice trivia (+100 pts per correct answer).
- **Random Wheel**: Host configures slices; server picks `wheelWinnerIndex` authoritatively.
- **Custom Polls**: Host creates custom questions and options with live vote bars.
