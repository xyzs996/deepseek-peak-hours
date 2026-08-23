# DeepSeek peak/off-peak: conformance vectors

A small, dated test table for DeepSeek's peak/off-peak billing rule, plus a
~30-line reference implementation that the table is checked against.

Source, read 2026-08-22 — <https://api-docs.deepseek.com/quick_start/pricing/>:

> Effective 00:00 (Beijing Time) on Sunday, August 23, 2026, we will adjust our
> peak/off-peak billing rules, with off-peak rates applying throughout the day
> on weekends.

That instant is `2026-08-22T16:00:00Z`. Off-peak is half of peak. The daily
peak windows are Beijing 09:00–12:00 and 14:00–18:00, i.e. `01:00-04:00` and
`06:00-10:00` UTC.

```
python3 check_vectors.py     # 18/18 passed
```

Public domain (CC0-1.0). Corrections welcome — if a vector is wrong I would
rather hear it than keep shipping it.

## Why this exists

Off-peak used to be a question about the clock. Since 2026-08-23 it is a
question about the clock **and** the calendar, and the calendar has to be the
right one. Three things go wrong when a time-only implementation grows a
weekend branch, and the third is invisible.

**1. Retroactivity.** Pricing functions get called with historical timestamps —
ledger replay, usage recomputation, cost dashboards over past requests. An
unconditional weekend discount silently shrinks every pre-rule weekend bill.
The discount has to be gated on the effective instant, and for a countdown the
gate is on the *candidate* instant, not on "now".

**2. The countdown lands inside the weekend.** Both sides of every window edge
inside the weekend are off-peak, so a countdown that stops at the next edge
reaches zero with nothing changing. From Beijing Friday 18:30 the next real
change is Monday 09:00, about 63 hours out — long enough that some UI strings
overflow.

**3. The weekday is read off the wrong calendar — and no test against the live
schedule can tell.** The Beijing weekend runs from **16:00 UTC Friday to 16:00
UTC Sunday**. The two calendars disagree only over 16:00–24:00 UTC, and both of
DeepSeek's peak windows sit clear of that stretch. So an implementation that
reads the weekday off the unshifted instant passes every vector you can write
against the official windows, and starts lying the day a vendor moves a window
past 16:00 UTC.

That last one is why this file carries a second, clearly-labelled synthetic
schedule whose peak window covers 16:00–22:00 UTC. It is not a real vendor
schedule and is not offered as one. It is the only way to pin the calendar
axis — and if your pricing code isn't parameterised by schedule, you cannot
test this axis at all, which is itself worth knowing.

## The vectors have teeth

Each of the three failure modes was introduced into the reference
implementation and the table re-run. Every mutation is caught, by the vectors
that claim to catch it:

| mutation | vectors that fail |
|---|---|
| weekday read off the unshifted UTC instant | `2026-08-28T16:30:00Z`, `2026-08-30T16:30:00Z` |
| effective-date gate removed | `2026-08-22T01:30:00Z`, `2026-08-22T09:59:59Z`, and the pre-rule boundary vector |
| countdown does not skip weekend-resident edges | `2026-08-28T10:30:00Z` |

## Using it

Either port `phase_at` — it is thirty boring lines and the schedule is data —
or ignore the Python entirely and paste the `vectors` array into whatever your
project uses for table-driven tests. Each entry is a UTC instant, the Beijing
wall clock it corresponds to, the expected phase, and one line on what it
discriminates.

## Where the sample came from

On 2026-08-23, the first day the rule applied, I read the pricing function of
15 DeepSeek cost/usage plugins and gateways. Two handled the weekend rule
correctly; eight computed a Beijing hour and stopped there, so a weekend call
was billed at twice the correct rate. Reports are filed on each — this is a
one-day snapshot of a moving target, not a ranking, and I have not re-checked
it since.

Two that had it right, if you want a second reference besides this one:
[`Han-1413141/dsh-cost-meter`](https://github.com/Han-1413141/dsh-cost-meter)
(including the countdown to Monday) and
[`xiufengsun/TokenTracker`](https://github.com/xiufengsun/TokenTracker), whose
comment says it plainly: *"The weekend is bounded in Beijing time, so it runs
16:00Z Friday to 16:00Z Sunday."*

The price table these numbers are kept in is at
<https://xyzs996.github.io/llm-api-pricing/prices.html>.
