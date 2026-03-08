/**
 * Recovery email layout recipes.
 * Maps recovery_type → ordered section list per email_templates.md.
 */

export const RECOVERY_TYPES = [
  "reminder",
  "product_interest",
  "social_proof",
  "objection_handling",
  "survey_qualification",
] as const;

export type RecoveryType = (typeof RECOVERY_TYPES)[number];

export const RECIPE_SECTIONS: Record<RecoveryType, readonly string[]> = {
  reminder: ["logo_header", "hero", "intro_text", "footer"],
  product_interest: ["logo_header", "hero", "intro_text", "benefits_list", "footer"],
  social_proof: ["logo_header", "hero", "testimonial", "footer"],
  objection_handling: ["logo_header", "hero", "objection_block", "footer"],
  survey_qualification: ["logo_header", "intro_text", "survey_cta", "footer"],
} as const;

export const RECIPE_METADATA: Record<
  RecoveryType,
  { description: string; sections: readonly string[] }
> = {
  reminder: {
    description: "Light browse abandonment, generic revisit nudges. Minimal text, single CTA, low pressure.",
    sections: RECIPE_SECTIONS.reminder,
  },
  product_interest: {
    description: "Product, service, or feature page visitors. Strong all-purpose recovery layout for SaaS and ecommerce.",
    sections: RECIPE_SECTIONS.product_interest,
  },
  social_proof: {
    description: "Mid-intent visitors at comparison or pricing stage. Builds trust, reduces hesitation.",
    sections: RECIPE_SECTIONS.social_proof,
  },
  objection_handling: {
    description: "Pricing page visitors, hesitant buyers. Answers one core hesitation with tight copy.",
    sections: RECIPE_SECTIONS.objection_handling,
  },
  survey_qualification: {
    description: "Incomplete surveys, lead qualification, finish-setup or book-now prompts. Short, direct, one CTA.",
    sections: RECIPE_SECTIONS.survey_qualification,
  },
};

export function getRecipeMetadata(
  recoveryType: RecoveryType
): { description: string; sections: readonly string[] } {
  return RECIPE_METADATA[recoveryType];
}

export function isValidRecoveryType(
  value: string
): value is RecoveryType {
  return RECOVERY_TYPES.includes(value as RecoveryType);
}
