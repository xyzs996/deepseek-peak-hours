# Conformance: nine real DeepSeek billing plugins, run against these vectors

```
node conformance/run.mjs            # the table below
node conformance/run.mjs --detail   # every failing vector, per project
```

No dependencies, no network, Node 16+. Results as of **2026-08-23**:

| project | lang | score | not run | symbol |
| --- | --- | --- | --- | --- |
| [dsh-cost-meter](https://github.com/Han-1413141/dsh-cost-meter) | JavaScript | **15/15** | — | `lib/pricing.js :: isPeakHour / weekendZoneAt` @6221646 |
| [dsh-deepseek-balance](https://github.com/lancecheney/dsh-plugins) | JavaScript | **12/12** | 3 | `packages/dsh-deepseek-balance/lib/index.js :: periodOfUsage` @5fc65bf |
| [dsh-billing-tui](https://github.com/Ethanz11-creat/dsh-billing-tui) | JavaScript | 9/12 | 3 | `lib/peak-detector.js :: isPeakTime` @f853ddf |
| [dsh-board](https://github.com/dfkai/dsh-board) | TypeScript | 9/12 | 3 | `src/pricing.ts :: isPeakHour / currentRate` @8f5b962 |
| [dsh-calculator](https://github.com/bobcat848/dsh-calculator) | JavaScript | 9/12 | 3 | `lib/index.js :: isPeak` @27881f2 |
| [dsh-gauge](https://github.com/noone89A/dsh-gauge) | TypeScript | 10/15 | — | `src/client/format.ts :: isPeakHour` @ca176d7 |
| [dsh-token-billing](https://github.com/2006spy/dsh-token-billing) | JavaScript | 10/15 | — | `lib/projection.js :: inWindow` @91ccbce |
| [dsh-token-price](https://github.com/spoon-man569/dsh-token-price) | TypeScript | 10/15 | — | `src/cost.ts :: isPeakTime` @c39f26f |
| [dsh-whale-meter](https://github.com/Shiye-10Pages/dsh-whale-meter) | TypeScript | 10/15 | — | `src/pricing.ts :: isPeakTime` @c484500 |

Every failure is the same three vectors, plus two more where the project can be
pointed at another schedule: **the weekend**. DeepSeek made the whole weekend
off-peak at 00:00 Beijing on 2026-08-23, and seven of these nine decide
peak/off-peak from the hour alone. Fourteen hours a week — the daily peak
windows that now fall on Saturday and Sunday — come back at the peak rate,
which is exactly twice the truth.

This is not a ranking of these projects. It is one function in each of them,
checked on one day, against one rule that changed the day before. Two of them
had it right before the change landed, which is why they are at the top rather
than absent.

## Why some rows say "not run"

Three vectors use a synthetic schedule whose peak window is `16:00-22:00 UTC`.
That window exists because the real one cannot expose the bug it is looking
for: DeepSeek's peak hours are `01:00-04:00` and `06:00-10:00 UTC`, both clear
of `16:00-24:00 UTC`, and `16:00-24:00 UTC` is the only stretch where the UTC
calendar and the Beijing calendar disagree about what day it is. So an
implementation that reads the weekday off the unshifted instant — `getUTCDay()`
— produces identical prices at all 168 hours of the current schedule and starts
lying the day a window moves.

A project whose windows are hard-coded cannot be pointed at that schedule from
the outside, so those three vectors do not run against it. That is not a pass
and not a fail; it means the calendar axis is untestable in that codebase
without changing it. Worth knowing on its own.

## The transcriptions

`adapters.mjs` holds a faithful transcription of each project's own predicate at
the commit named in the table — same branches, same operators, same window
semantics, type annotations dropped where the original is TypeScript. Nothing is
vendored: each is ~10 lines of arithmetic quoted for interoperability testing,
and each project's licence governs its own code.

Re-check any of them yourself:

```
gh api repos/dfkai/dsh-board/contents/src/pricing.ts --jq .content | base64 -d
```

**If a transcription is wrong, that is a bug here, not a finding about anyone's
project.** Open an issue and it gets corrected and re-run.

## If you fixed it

Comment on the pinned scoreboard, [issue #1](https://github.com/xyzs996/deepseek-peak-hours/issues/1) — it carries the same nine rows, each linked to its own tracker, and it is where rows get marked done. Or here:

Open an issue or a PR here with the new commit and the row gets re-run and
updated. If you think a vector's *expectation* is wrong — in particular if you
read the English footnote as UTC weekdays rather than Beijing weekdays — the
argument belongs on the vectors, not on your code: open an issue on
`deepseek-peak-offpeak-vectors.json` and say which instant should flip. The
table follows the vectors, so changing the vectors changes the table.

Each of the seven has an issue open on its own tracker with the failing
instants and a patch in its own language. This directory is the same finding
made re-runnable.
