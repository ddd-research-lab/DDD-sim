# Card Analysis

## DD Lance Soldier
- Check Card ID and Properties in `cards.ts`.

## Zero Kind Zero Laplace / Zero Doom Queen Machinex
- Identify which "Zero" card the user means.
- Check Properties.

## Whitest Hell Armageddon (c035)
- Level: 10
- Type: Synchro
- Material: Tuner + Non-Tuner (Generic or Specific?)
  - Code uses generic check: `tuners.some` + `nonTuners.some` -> Sum = Target.

## Potential Issues
- "Lance Soldier" is Level 4? "Zero Laplace" is Level 10? Sum = 14 != 10.
- "Lance Soldier" is Level 4? "Zero Machinex" is Rank 10? (Ranks don't have levels usually for Synchro).
- Is "Lance Soldier" a Tuner? (Usually not).
- Is one of them treated as a Tuner by effect? (e.g. Orthros effect?).
