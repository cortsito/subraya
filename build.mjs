import * as esbuild from "esbuild";
import { rm, mkdir, cp } from "node:fs/promises";

const watch = process.argv.includes("--watch");
const outdir = "dist";

const entryPoints = {
  "background/index": "src/background/index.ts",
  "content/index": "src/content/index.ts",
  "popup/popup": "src/popup/popup.ts",
  "library/library": "src/library/library.ts",
};

const staticFiles = [
  ["manifest.json", "manifest.json"],
  ["src/popup/popup.html", "popup/popup.html"],
  ["src/library/library.html", "library/library.html"],
];

async function copyStaticFiles() {
  for (const [from, to] of staticFiles) {
    await mkdir(new URL(`${outdir}/${to}/..`, import.meta.url), { recursive: true });
    await cp(from, `${outdir}/${to}`);
  }
}

async function main() {
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  await copyStaticFiles();

  const buildOptions = {
    entryPoints,
    entryNames: "[dir]/[name]",
    outdir,
    bundle: true,
    format: "iife",
    target: "chrome110",
    sourcemap: watch ? "inline" : false,
    minify: !watch,
    logLevel: "info",
  };

  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes... (HTML/manifest edits require a re-run)");
  } else {
    await esbuild.build(buildOptions);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
