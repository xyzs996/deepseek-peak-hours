#!/usr/bin/env python3
"""Run every vector in deepseek-peak-offpeak-vectors.json against a reference
implementation of DeepSeek's peak/off-peak rule.

    python3 check_vectors.py

Stdlib only, Python 3.9+. Exit code 0 when every vector passes.

The reference implementation below is ~30 lines and deliberately boring. It is
here so the vectors have something to be checked against, and so a project that
wants to port the rule has a shape to port. The vectors, not this file, are the
artifact.
"""
import json
import sys
from datetime import datetime, timedelta, timezone


def parse(instant):
    return datetime.strptime(instant, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def hhmm(text):
    h, m = text.split(":")
    return int(h) * 60 + int(m)


def peak_weekdays(schedule):
    """The ISO weekday numbers (1 = Monday) the peak windows run on at all.

    Required, not defaulted. A schedule that omits this field is a schedule
    with no weekday axis, and filling in Monday-to-Friday on its behalf is
    exactly the guess that puts the rule back inside the code -- where seven
    of nine measured projects keep it, and where nobody can correct it.
    """
    days = schedule.get("peak_weekdays")
    if not days:
        raise KeyError("schedule has no peak_weekdays; this rule has a weekday "
                       "axis, so a schedule without one cannot be evaluated")
    return set(days)


def phase_at(when, schedule):
    """'peak' or 'offpeak' for a UTC instant under a schedule."""
    offset = timedelta(hours=schedule["calendar_utc_offset_hours"])
    local = when + offset
    effective = parse(schedule["weekend_offpeak_effective_utc"])

    # Two separate things, both load-bearing. WHICH days are peak days comes
    # from the schedule, not from this file. WHICH CALENDAR the day is counted
    # on is the shifted instant, not `when`: the two calendars disagree over
    # 16:00-24:00 UTC, and no vector against the live schedule can tell the
    # difference.
    if when >= effective and local.isoweekday() not in peak_weekdays(schedule):
        return "offpeak"

    minute_of_day = when.hour * 60 + when.minute
    for start, end in schedule["peak_windows_utc"]:
        if hhmm(start) <= minute_of_day < hhmm(end):
            return "peak"
    return "offpeak"


def next_change(when, schedule):
    """The next instant the phase changes, and the phase that begins there."""
    now = phase_at(when, schedule)
    # Candidates: every window edge, plus local midnight (the calendar-day
    # boundary), for the next nine days. Nine covers any weekend plus margin.
    edges = {hhmm(edge) for window in schedule["peak_windows_utc"] for edge in window}
    edges.add((24 - schedule["calendar_utc_offset_hours"]) % 24 * 60)
    day = when.replace(hour=0, minute=0, second=0, microsecond=0)
    for ahead in range(10):
        for edge in sorted(edges):
            candidate = day + timedelta(days=ahead, minutes=edge)
            if candidate <= when:
                continue
            if phase_at(candidate, schedule) != now:
                return candidate, phase_at(candidate, schedule)
    raise AssertionError("no boundary within nine days")


def config_check(schedules):
    """Prove this file READS `peak_weekdays` instead of hard-coding the weekend.

    None of the vectors above can prove it. The live rule's non-peak days are
    Saturday and Sunday, so `local.isoweekday() not in {1,2,3,4,5}` and a
    hard-coded `>= 5` agree at all 168 hours of the week -- an implementation
    that ignores the field passes every vector, and then bills the wrong day
    the first time a vendor moves the rule.

    So: take the synthetic schedule, add Saturday to its peak days, and ask for
    a Beijing Saturday inside its window. Reading the field flips the answer;
    hard-coding the weekend does not.
    """
    at = parse("2026-08-28T16:30:00Z")          # Beijing Sat 2026-08-29 00:30
    five = schedules["synthetic-overnight-peak"]
    six = dict(five, peak_weekdays=[1, 2, 3, 4, 5, 6])
    return [("peak_weekdays=1-5, Beijing Sat 00:30 -> offpeak",
             phase_at(at, five), "offpeak"),
            ("peak_weekdays=1-6, same instant     -> peak",
             phase_at(at, six), "peak")]


def main():
    doc = json.load(open("deepseek-peak-offpeak-vectors.json", encoding="utf-8"))
    schedules = doc["schedules"]
    failed = []

    for v in doc["vectors"]:
        got = phase_at(parse(v["at_utc"]), schedules[v["schedule"]])
        ok = got == v["expect"]
        print(f"{'ok  ' if ok else 'FAIL'} {v['at_utc']}  {v['beijing_local']:<14} "
              f"expect {v['expect']:<7} got {got}")
        if not ok:
            failed.append(v["at_utc"])

    for b in doc["next_boundary_vectors"]:
        at, phase = next_change(parse(b["from_utc"]), schedules[b["schedule"]])
        got = at.strftime("%Y-%m-%dT%H:%M:%SZ")
        ok = got == b["expect_next_change_utc"] and phase == b["expect_next_phase"]
        print(f"{'ok  ' if ok else 'FAIL'} from {b['from_utc']} -> "
              f"expect {b['expect_next_change_utc']} {b['expect_next_phase']:<7} "
              f"got {got} {phase}")
        if not ok:
            failed.append(b["from_utc"])

    checks = config_check(schedules)
    for label, got, want in checks:
        ok = got == want
        print(f"{'ok  ' if ok else 'FAIL'} config  {label}  got {got}")
        if not ok:
            failed.append(label)

    total = (len(doc["vectors"]) + len(doc["next_boundary_vectors"])
             + len(checks))
    print(f"\n{total - len(failed)}/{total} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
