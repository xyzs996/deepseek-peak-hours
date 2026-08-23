#!/usr/bin/env node
// Run the vectors against nine published DeepSeek billing plugins.
//
//     node conformance/run.mjs            # the table
//     node conformance/run.mjs --detail   # plus every failing vector, per project
//     node conformance/run.mjs --markdown # the table in RESULTS.md's format
//
// No dependencies, no network, Node 16+. Exit code is always 0: this reports
// on other people's code, so a failure here is news, not a broken build.

import { readFileSync } from "node:fs";
import { adapters } from "./adapters.mjs";

const doc = JSON.parse(readFileSync(
  new URL("../deepseek-peak-offpeak-vectors.json", import.meta.url), "utf8"));

const detail = process.argv.includes("--detail");
const pad = (t, w) => String(t).padEnd(w);

const results = adapters.map((a) => {
  const rows = doc.vectors.map((v) => {
    const got = a.phase(Date.parse(v.at_utc), v.schedule);
    return { v, got, ok: got === null ? null : got === v.expect };
  });
  const ran = rows.filter((r) => r.ok !== null);
  const failed = ran.filter((r) => r.ok === false);
  const skipped = rows.length - ran.length;
  return { a, rows, ran: ran.length, failed, skipped };
});

results.sort((x, y) =>
  (x.failed.length - y.failed.length) || (y.ran - x.ran) || x.a.id.localeCompare(y.a.id));

if (process.argv.includes("--markdown")) {
  console.log("| project | lang | score | not run | symbol |");
  console.log("| --- | --- | --- | --- | --- |");
  for (const r of results) {
    const score = `${r.ran - r.failed.length}/${r.ran}`;
    console.log(`| [${r.a.id}](https://github.com/${r.a.repo}) | ${r.a.lang} `
      + `| ${r.failed.length === 0 ? "**" + score + "**" : score} `
      + `| ${r.skipped === 0 ? "—" : r.skipped} | \`${r.a.symbol}\` @${r.a.at} |`);
  }
  process.exit(0);
}

console.log(`DeepSeek peak/off-peak conformance — ${doc.vectors.length} vectors, `
  + `source read ${doc.source.read_on}\n`);
console.log(pad("project", 24) + pad("lang", 12) + pad("score", 8)
  + pad("not run", 9) + "symbol");
console.log("-".repeat(96));
for (const r of results) {
  const score = `${r.ran - r.failed.length}/${r.ran}`;
  console.log(pad(r.a.id, 24) + pad(r.a.lang, 12) + pad(score, 8)
    + pad(r.skipped === 0 ? "-" : String(r.skipped), 9) + r.a.symbol);
}

const notRun = results.filter((r) => r.skipped > 0);
if (notRun.length > 0) {
  console.log(`\n"not run" = vectors on the synthetic schedule, whose peak window is`);
  console.log(`16:00-22:00 UTC. Projects with hard-coded windows cannot be pointed at`);
  console.log(`another schedule, so the calendar axis is untestable in them from the`);
  console.log(`outside — which is itself worth knowing.`);
}

if (detail) {
  for (const r of results) {
    if (r.failed.length === 0) continue;
    console.log(`\n${r.a.id}  <https://github.com/${r.a.repo}>  @${r.a.at}`);
    for (const f of r.failed) {
      console.log(`  ${f.v.at_utc}  ${pad(f.v.beijing_local, 14)} `
        + `expect ${pad(f.v.expect, 7)} got ${pad(f.got, 7)}  ${f.v.why}`);
    }
  }
}

const broken = results.filter((r) => r.failed.length > 0).length;
console.log(`\n${results.length - broken} of ${results.length} projects pass every `
  + `vector they can run.`);
