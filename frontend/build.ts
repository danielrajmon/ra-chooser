import * as path from "path";
import { build, context } from "esbuild";

const isWatchMode = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: [path.resolve("main.ts")],
  bundle: true,
  format: "esm" as const,
  platform: "browser" as const,
  target: ["es2022"],
  outfile: path.resolve("main.js"),
  sourcemap: true,
  logLevel: "info" as const,
};

async function runBuild(): Promise<void> {
  if (isWatchMode) {
    const buildContext = await context(buildOptions);
    await buildContext.watch();
    console.log("[build] watching frontend TypeScript files...");
    return;
  }

  await build(buildOptions);
}

void runBuild().catch((error) => {
  console.error(error);
  process.exit(1);
});
