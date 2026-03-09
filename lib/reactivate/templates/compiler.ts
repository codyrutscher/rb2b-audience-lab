import mjml from "mjml";
import type { RecoveryType } from "../recipes";
import { RECIPE_SECTIONS } from "../recipes";
import { renderSectionMjml } from "./sections";
import type { EmailSlots } from "./emailSlots";

/** Compile MJML to HTML in-process so it works on Vercel (no subprocess). */
function mjmlToHtml(mjmlSource: string): string {
  const result = mjml(mjmlSource, { validationLevel: "soft", minify: false });
  return result.html;
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

  return mjmlToHtml(mjml);
}
