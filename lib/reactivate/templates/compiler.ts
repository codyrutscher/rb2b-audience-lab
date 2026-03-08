import { spawnSync } from "node:child_process";
import path from "node:path";
import type { RecoveryType } from "../recipes";
import { RECIPE_SECTIONS } from "../recipes";
import { renderSectionMjml } from "./sections";
import type { EmailSlots } from "./emailSlots";

/**
 * Compile MJML to HTML via subprocess to avoid uglify-js ENOENT in Next.js RSC.
 * MJML runs in a plain Node process with normal module resolution.
 */
function mjmlToHtmlViaSubprocess(mjml: string): string {
  const scriptPath = path.join(process.cwd(), "scripts", "mjml-compile.mjs");
  const result = spawnSync("node", [scriptPath], {
    input: mjml,
    encoding: "utf8",
    timeout: 10000,
  });
  if (result.error) {
    throw new Error(`MJML subprocess failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`MJML subprocess exited ${result.status}: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

/**
 * Assemble sections by recipe and compile MJML to HTML.
 */
export function compileRecipe(
  recoveryType: RecoveryType,
  slots: EmailSlots
): string {
  const sectionIds = RECIPE_SECTIONS[recoveryType];
  const sections: string[] = [];

  for (const id of sectionIds) {
    const mjml = renderSectionMjml(id, slots);
    if (mjml.trim()) sections.push(mjml);
  }

  const mjml = `<mjml>
  <mj-head>
    <mj-preview>${(slots.preheader || slots.subject || "").slice(0, 130)}</mj-preview>
  </mj-head>
  <mj-body width="600px" background-color="#ffffff">
    ${sections.join("\n")}
  </mj-body>
</mjml>`;

  return mjmlToHtmlViaSubprocess(mjml);
}
