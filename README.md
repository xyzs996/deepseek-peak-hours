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

### The English page drops a timezone (re-read 2026-08-23)

The rule is in force as of today, and the announcement quoted above is no longer
on the page — both language versions now carry the steady-state footnote
instead. They do not say the same thing:

> **EN** — Off-peak rates are half of the peak rates. Peak hours are 01:00 -
> 04:00 and 06:00 - 10:00 UTC, Monday through Friday (all other hours are
> off-peak).

> **ZH** — 空闲时段价格为高峰时段价格的一半。高峰时段为北京时间周一至周五 9:00 - 12:00、14:00 -
> 18:00（其余为空闲时段）。

The hours agree — Beijing 09:00–12:00 and 14:00–18:00 *are* 01:00–04:00 and
06:00–10:00 UTC. The calendar does not. The Chinese sentence puts the weekday in
Beijing time (北京时间周一至周五); the English one attaches `UTC` to the hours and
leaves “Monday through Friday” unqualified, which reads as UTC weekdays. The two
readings differ over 16:00–24:00 UTC on Friday and on Sunday — sixteen hours a
week, every week.

And by failure mode 3 below, nothing catches it: both peak windows sit clear of
16:00–24:00 UTC, so the two calendars produce identical prices at all 168 hours
of the current schedule. An implementation written from the English sentence is
wrong in a way that no vector against the published windows can show.

This repository follows the Chinese wording and reads the weekday off the
Beijing calendar. If you think that is the wrong call, the vectors it rests on
are `2026-08-28T16:30:00Z` and `2026-08-30T16:30:00Z` — open an issue on those
two rather than on prose.

```
python3 check_vectors.py     # 18/18 passed
```

Used in anger by <https://xyzs996.github.io/llm-cost-calculator/>, whose
`test/check.mjs` downloads this table rather than vendoring it — so if a vector
here changes, that page's clock is re-checked against the new one.

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
19 DeepSeek cost/usage plugins, gateways and price catalogues. Four had the
weekend rule right. One had the machinery right and the default config stale —
a `weekdays` field that exists, is honoured everywhere, and is simply absent
from the shipped defaults. The remaining fourteen split between two failure
shapes: an hour-only branch that bills a weekend call at twice the correct
rate, and — in two of the config-driven ones — a schema with no weekday axis at
all, where the rule cannot be expressed no matter how the code is written.
Reports are filed on each. This is a one-day snapshot of a moving target, not a
ranking, and it will go stale.

The schema cases are the ones worth catching early: adding a day-of-week
dimension before a pricing config ships is a field, and afterwards it is a
migration.

The four that had it right, if you want a reference besides this one:
[`Han-1413141/dsh-cost-meter`](https://github.com/Han-1413141/dsh-cost-meter)
(including the countdown to Monday);
[`xiufengsun/TokenTracker`](https://github.com/xiufengsun/TokenTracker), whose
comment says it plainly — *"The weekend is bounded in Beijing time, so it runs
16:00Z Friday to 16:00Z Sunday"*;
[`Calcium-Ion/new-api`](https://github.com/Calcium-Ion/new-api), which sidesteps
the problem by making the billing rule an expression with `hour(tz)` and
`weekday(tz)` taking the same timezone argument; and
[`zeronx798/LiangWenPeak`](https://github.com/zeronx798/LiangWenPeak), which
gets both axes for free by carrying a `BeijingTime` type — the weekday is read
off `LocalDate()`, so there is no unshifted instant to read it off by mistake —
and finds the next boundary by comparing the phase either side of each
candidate, which skips weekend-resident edges without special-casing them.

## Elsewhere

A cost calculator that applies these rules to a real bill — pick a model, put
in your token mix, and it tells you which side of the rate card you are on right
now and what waiting is worth: <https://xyzs996.github.io/llm-cost-calculator/>.

The price table these numbers are kept in, updated daily:
<https://xyzs996.github.io/llm-api-pricing/prices.html>. The write-ups behind
it are at <https://xyzs996.github.io/llm-api-pricing/> — mostly about what
these costs do to a small budget in practice, which is a different question
from what the rate card says.
