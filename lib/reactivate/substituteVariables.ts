/**
 * Strip a leading "Hi {{First_Name}}, " (or first_name) so the template's own greeting line is not duplicated.
 */
export function stripLeadingGreeting(text: string): string {
  return text.replace(/^\s*Hi\s+\{\{\s*(?:First_Name|first_name)\s*\}\}\s*,?\s*/i, "").trim();
}

/**
 * Substitute {{VarName}} and [VarName] in text with values from variable_values.
 * Used for subject lines, body copy, and preview.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function substituteVariables(
  text: string,
  options: {
    variableValues?: Record<string, string> | null;
    firstName?: string | null;
  }
): string {
  const { variableValues, firstName } = options;
  let out = text;
  if (variableValues && typeof variableValues === "object") {
    for (const [key, val] of Object.entries(variableValues)) {
      if (!key || val == null) continue;
      const escaped = escapeRegex(key);
      const re1 = new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "gi");
      const re2 = new RegExp(`\\[\\s*${escaped}\\s*\\]`, "gi");
      out = out.replace(re1, String(val)).replace(re2, String(val));
    }
  }
  const nameVal = firstName ?? variableValues?.First_Name ?? variableValues?.first_name ?? "";
  if (nameVal) {
    out = out.replace(/\{\{\s*Reader's Name\s*\}\}/gi, nameVal).replace(/\[\s*Reader's Name\s*\]/gi, nameVal);
  }
  return out;
}
