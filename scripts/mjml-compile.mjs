#!/usr/bin/env node
/**
 * Standalone MJML compiler. Reads MJML from stdin, outputs HTML to stdout.
 * Runs in a separate Node process to avoid Next.js bundling issues (uglify-js ENOENT).
 */
import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mjml2html = require("mjml");

const input = readFileSync(0, "utf8");
const result = mjml2html(input, {
  validationLevel: "soft",
  minify: false,
});
process.stdout.write(result.html);
