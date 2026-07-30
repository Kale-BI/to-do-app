import { build } from "esbuild";

// Bundle the Vercel function into a single self-contained ESM file that the
// checked-in api/index.js re-exports. Two Vercel constraints shape this:
// the zero-config api/ builder compiles only the entry file and leaves
// workspace imports as raw specifiers pointing at .ts sources (unloadable at
// runtime), and it enumerates api/ entrypoints before the build command runs,
// so the entry itself cannot be generated — only its import can.
await build({
  entryPoints: ["server/entry.ts"],
  outfile: "api/_bundle.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["pg-native"],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
