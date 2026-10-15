// Offline-only: turn Obsidian-flavoured Markdown in the corpus into standard
// Markdown. Nothing here runs during `astro build` — do NOT import this file
// from astro.config.mjs or any page or component.
//
// Scope is deliberate. obsidian-export resolves [[wikilinks]] and ![[embeds]];
// that is all it is asked to do. Callouts (> [!note]) and ==highlights== are
// passed through untouched on purpose: the blog's Astro pipeline renders those,
// and flattening them here would silently break the rendering.
//
// Requires the `obsidian-export` binary. Install it once with:
//   cargo install obsidian-export
// or drop a prebuilt release on PATH:
//   https://github.com/zoni/obsidian-export/releases
//
// The destination is the Astro content collection, which already holds
// published posts. The exporter overwrites without asking, so this stages into
// a temp directory first and only writes files that do not exist yet. Pass
// --overwrite to replace them.
//
// Usage:
//   node scripts/export-corpus.mjs [--from DIR] [--to DIR] [--vault DIR]
//                                  [--ignore NAME] [--overwrite] [--dry-run]

import { spawn } from "node:child_process";
import {
  accessSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BINARY = "obsidian-export";
const DEFAULT_FROM = join(homedir(), "Desktop", "LifeCorpus", "published");
const DEFAULT_TO = join(PROJECT_ROOT, "src", "content", "posts");
// Vault docs and dot/underscore-prefixed files are not articles.
const DEFAULT_IGNORE = ["README.md", ".*", "_*"];

const WIKILINK = /(?<!!)\[\[([^\]]+)\]\]/g;
const EMBED = /!\[\[([^\]]+)\]\]/g;
const CALLOUT = /^>[ \t]*\[!([a-z]+)\]/gim;
const HIGHLIGHT = /==\S[^=\n]*\S==/g;
// A CommonMark link whose target is another note. The lookbehind keeps image
// syntax out; it is handled by the blog's image pipeline, not here.
const LINK = /(?<!!)\[([^\]]*)\]\(([^)\s]+\.md(#[^)\s]*)?)\)/g;

function parseArgs(argv) {
  const options = {
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
    vault: null,
    ignore: [...DEFAULT_IGNORE],
    dryRun: false,
    overwrite: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--overwrite") {
      options.overwrite = true;
    } else if (arg === "--from" && next) {
      options.from = next;
      i += 1;
    } else if (arg === "--to" && next) {
      options.to = next;
      i += 1;
    } else if (arg === "--vault" && next) {
      options.vault = next;
      i += 1;
    } else if (arg === "--ignore" && next) {
      options.ignore.push(next);
      i += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return options;
}

const isInside = (parent, child) => {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith(sep));
};

function findBinary() {
  const candidates = (process.env.PATH ?? "")
    .split(":")
    .filter(Boolean)
    .map((dir) => join(dir, BINARY))
    .concat(join(homedir(), ".cargo", "bin", BINARY));
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Present but not executable; keep looking.
    }
  }
  return null;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() ? [full] : [];
  });
}

const countOf = (text, pattern) => (text.match(pattern) ?? []).length;

// obsidian-export turns [[note]] into a path relative to the note's place in
// the vault. Those paths mean nothing once the file sits in the blog's content
// collection, so they are mapped onto /posts/<slug>/ here — the slug being the
// file name, which is what the blog uses.
//
// A reference that lands outside the source directory points at a note that is
// not being published. It is left untouched and reported rather than rewritten:
// turning it into a /posts/ URL would only dress a dead link up as a live one.
function rewriteLinks(text, { vault, startAt, rel, inside }) {
  const sourceInVault = join(vault, startAt, rel);
  const outside = [];
  let count = 0;
  const rewritten = text.replace(LINK, (whole, label, url) => {
    const [encoded, anchor = ""] = url.split("#");
    let decoded = encoded;
    try {
      decoded = decodeURIComponent(encoded);
    } catch {
      decoded = encoded;
    }
    const target = resolve(dirname(sourceInVault), decoded);
    if (!isInside(inside, target)) {
      outside.push(decoded);
      return whole;
    }
    count += 1;
    const slug = basename(target, ".md");
    const hash = anchor ? `#${anchor}` : "";
    return `[${label}](/posts/${slug}/${hash})`;
  });
  return { text: rewritten, outside, count };
}

function run(binary, args) {
  return new Promise((done, fail) => {
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (err += chunk));
    child.on("error", fail);
    child.on("close", (code) => done({ code, out, err }));
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const from = resolve(options.from);
  const to = resolve(options.to);

  if (!existsSync(from) || !statSync(from).isDirectory()) {
    throw new Error(`Source directory not found: ${from}`);
  }

  // obsidian-export only resolves links and embeds when it is pointed at the
  // vault root, so the vault defaults to the parent of the source directory.
  const vault = options.vault ? resolve(options.vault) : dirname(from);
  if (!existsSync(vault) || !statSync(vault).isDirectory()) {
    throw new Error(`Vault root not found: ${vault}`);
  }
  if (!isInside(vault, from)) {
    throw new Error(`Source ${from} is not inside vault ${vault}`);
  }

  // The exporter overwrites files in the destination, so never let it point
  // back at the corpus or anywhere containing it.
  if (to === from || isInside(to, from)) {
    throw new Error(
      `Refusing to write into the source tree: ${to} contains ${from}`,
    );
  }

  const startAt = relative(vault, from) || ".";
  const ignoreDir = mkdtempSync(join(tmpdir(), "corpus-export-"));
  const ignoreFile = join(ignoreDir, ".export-ignore");
  writeFileSync(ignoreFile, `${options.ignore.join("\n")}\n`);

  // Export into a staging directory first. The destination already holds
  // published posts and the exporter overwrites whatever it finds.
  const staging = mkdtempSync(join(tmpdir(), "corpus-stage-"));
  const args = [
    vault,
    staging,
    "--start-at",
    from,
    "--ignore-file",
    ignoreFile,
  ];
  console.log(`vault   ${vault}`);
  console.log(`source  ${from}  (--start-at ${startAt})`);
  console.log(`target  ${to}${options.overwrite ? "  (overwrite)" : ""}`);
  console.log(`ignore  ${options.ignore.join(", ")}`);

  if (options.dryRun) {
    console.log(
      `\n[dry-run] ${BINARY} ${args.map((a) => JSON.stringify(a)).join(" ")}`,
    );
    rmSync(staging, { recursive: true, force: true });
    rmSync(ignoreDir, { recursive: true, force: true });
    return;
  }

  const binary = findBinary();
  if (!binary) {
    rmSync(staging, { recursive: true, force: true });
    rmSync(ignoreDir, { recursive: true, force: true });
    console.error(`\n${BINARY} not found on PATH or in ~/.cargo/bin.`);
    console.error("Install it once, then re-run:");
    console.error("  cargo install obsidian-export");
    console.error("or  https://github.com/zoni/obsidian-export/releases");
    process.exitCode = 1;
    return;
  }

  const { code, out, err } = await run(binary, args);
  rmSync(ignoreDir, { recursive: true, force: true });

  if (out.trim()) console.log(out.trim());
  // The exporter prints warnings about broken references to stderr.
  if (err.trim()) console.error(err.trim());
  if (code !== 0) {
    console.error(`\n${BINARY} exited with code ${code}`);
    rmSync(staging, { recursive: true, force: true });
    process.exitCode = code;
    return;
  }

  const staged = walk(staging).filter(
    (path) => extname(path).toLowerCase() === ".md",
  );
  mkdirSync(to, { recursive: true });
  const written = [];
  const skipped = [];
  const external = [];
  let rewritten = 0;
  for (const path of staged) {
    const rel = relative(staging, path);
    const target = join(to, rel);
    if (existsSync(target) && !options.overwrite) {
      skipped.push(rel);
      continue;
    }
    const result = rewriteLinks(readFileSync(path, "utf8"), {
      vault,
      startAt,
      rel,
      inside: from,
    });
    rewritten += result.count;
    for (const item of result.outside) external.push({ rel, item });
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, result.text);
    written.push(target);
  }
  rmSync(staging, { recursive: true, force: true });

  let unresolved = 0;
  let embeds = 0;
  let callouts = 0;
  let highlights = 0;
  for (const path of written) {
    const text = readFileSync(path, "utf8");
    const left = countOf(text, WIKILINK);
    if (left) {
      unresolved += left;
      console.warn(`  unresolved [[link]] x${left}: ${basename(path)}`);
    }
    embeds += countOf(text, EMBED);
    callouts += countOf(text, CALLOUT);
    highlights += countOf(text, HIGHLIGHT);
  }

  console.log(`\nWrote ${written.length} file(s) to ${to}`);
  if (skipped.length) {
    console.log(
      `Skipped ${skipped.length} (already there, --overwrite to replace):`,
    );
    for (const rel of skipped) console.log(`  ${rel}`);
  }
  console.log(`  links rewritten       ${rewritten}`);
  if (external.length) {
    console.log("\nReferences to notes outside the source (left as-is):");
    for (const { rel, item } of external) console.log(`  ${rel} -> ${item}`);
  }
  console.log(`  unresolved wikilinks  ${unresolved}`);
  console.log(`  unresolved embeds     ${embeds}`);
  console.log(`  callouts kept         ${callouts}  (rendered by Astro)`);
  console.log(`  highlights kept       ${highlights}  (rendered by Astro)`);
}

main().catch((error) => {
  console.error(String(error?.stack ?? error));
  process.exitCode = 1;
});
