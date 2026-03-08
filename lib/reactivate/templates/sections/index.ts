import type { EmailSlots } from "../emailSlots";
import { renderLogoHeaderMjml } from "./logoHeader";
import { renderHeroMjml } from "./hero";
import { renderIntroTextMjml } from "./introText";
import { renderBenefitsListMjml } from "./benefitsList";
import { renderTestimonialMjml } from "./testimonial";
import { renderObjectionBlockMjml } from "./objectionBlock";
import { renderSurveyCtaMjml } from "./surveyCta";
import { renderFooterMjml } from "./footer";

const SECTION_RENDERERS: Record<string, (slots: EmailSlots) => string> = {
  logo_header: renderLogoHeaderMjml,
  hero: renderHeroMjml,
  intro_text: renderIntroTextMjml,
  benefits_list: renderBenefitsListMjml,
  testimonial: renderTestimonialMjml,
  objection_block: renderObjectionBlockMjml,
  survey_cta: renderSurveyCtaMjml,
  footer: renderFooterMjml,
};

export function renderSectionMjml(sectionId: string, slots: EmailSlots): string {
  const render = SECTION_RENDERERS[sectionId];
  if (!render) return "";
  return render(slots);
}

export { renderLogoHeaderMjml, renderHeroMjml, renderIntroTextMjml, renderBenefitsListMjml, renderTestimonialMjml, renderObjectionBlockMjml, renderSurveyCtaMjml, renderFooterMjml };
