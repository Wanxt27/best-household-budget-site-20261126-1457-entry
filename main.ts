// Hearth Ledger — entry program (main.ts).
// Copies app/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from
// vendor/makefun-frontend.ts. Node 22 standard library only.
//
// The output directory itself is never deleted: only its known
// contents (app/, screenshots/, dossier.json) are cleared first, so
// repeated runs write the same bytes.
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

function clearKnownOutputs(dir: string): void {
  for (const name of ["app", "screenshots", "dossier.json"]) {
    const target = join(dir, name);
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
    }
  }
}

function copyTree(src: string, dest: string): void {
  // Refuse symlinks up front: the gate wants plain files only, and a
  // link copied blindly could point outside the repository.
  refuseLinks(src);
  // cpSync with dereference off: a symlink in the repo is refused
  // rather than followed, so the output holds plain files only.
  cpSync(src, dest, { recursive: true, dereference: false });
}

function refuseLinks(dir: string): void {
  for (const name of readdirSync(dir)) {
    const target = join(dir, name);
    const st = lstatSync(target);
    if (st.isSymbolicLink()) {
      throw new Error("main.ts: refusing symlink in the repository: " + target);
    }
    if (st.isDirectory()) refuseLinks(target);
  }
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  clearKnownOutputs(outDir);

  const appSrc = join(repoRoot, "app");
  const shotsSrc = join(repoRoot, "screenshots");
  if (!existsSync(appSrc) || !statSync(appSrc).isDirectory()) {
    throw new Error("main.ts: app/ is missing from the repository");
  }
  if (!existsSync(shotsSrc) || !statSync(shotsSrc).isDirectory()) {
    throw new Error("main.ts: screenshots/ is missing from the repository");
  }

  copyTree(appSrc, join(outDir, "app"));
  copyTree(shotsSrc, join(outDir, "screenshots"));

  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  });
  writeFileSync(join(outDir, "dossier.json"), dossier);
  console.log("wrote " + join(outDir, "dossier.json") + " (" + dossier.length + " bytes)");

  // Verify the hand-in before reporting success: the output must hold
  // app/index.html, every screenshot, and the dossier, and nothing else
  // at the top level.
  const top = readdirSync(outDir).sort();
  const expected = ["app", "dossier.json", "screenshots"];
  if (JSON.stringify(top) !== JSON.stringify(expected)) {
    throw new Error("main.ts: unexpected output contents: " + top.join(", "));
  }
  const shots = readdirSync(join(outDir, "screenshots")).filter((n) => !n.startsWith("."));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error("main.ts: expected 3-4 screenshots, found " + shots.length);
  }
  console.log("verified output: app/ + " + shots.length + " screenshots + dossier.json");
}

main();
