# Modular Recovery Email Template System — Implementation Milestones

> Implementation plan for the Templates interface, aligned with `email_templates.md`.  
> Current state: single `minimal_recovery` template with KB + AI copy + variable mappings.  
> Target: section-based, recipe-driven, recovery-type-first UX.

---

## Phase 1: Foundation — Recovery Type & Recipe Model

**Goal:** Replace "template picker" with "recovery type picker". User chooses intent, system selects layout.

### Milestone 1.1: Recovery Type Selection (UI)

- [ ] Add **Step 1: Choose recovery email type** as the primary entry point on Templates page
- [ ] Five options (radio or card selector):
  - **Reminder** — light browse abandonment, generic revisit
  - **Product Interest** — product/service/feature page visitors
  - **Social Proof** — mid-intent, comparison/pricing visitors
  - **Objection Handling** — pricing/hesitant buyers
  - **Survey / Qualification** — incomplete surveys, lead qualification
- [ ] Persist selected `recovery_type` when creating/editing a template
- [ ] **Schema:** Add `recovery_type` column to `rt_email_templates` (enum: `reminder | product_interest | social_proof | objection_handling | survey_qualification`)

**Deliverable:** User selects recovery type before configuring content. No layout changes yet.

---

### Milestone 1.2: Recipe-to-Layout Mapping

- [ ] Define `RECIPE_SECTIONS` in code: map `recovery_type` → ordered section list
  - `reminder` → `logo_header, hero, intro_text, footer`
  - `product_interest` → `logo_header, hero, benefits_list, footer`
  - `social_proof` → `logo_header, hero, testimonial, footer`
  - `objection_handling` → `logo_header, hero, objection_block, footer`
  - `survey_qualification` → `logo_header, intro_text, survey_cta, footer`
- [ ] Expose recipe metadata to UI (sections used, description)
- [ ] **API:** `GET /api/reactivate/recipe-metadata` returns `{ recovery_type, sections[], description }` for each type

**Deliverable:** Backend knows which sections each recovery type uses. UI can display "This email includes: logo, headline, benefits, footer."

---

## Phase 2: Section Library & MJML Infrastructure

**Goal:** Build reusable MJML sections and a recipe compiler.

### Milestone 2.1: MJML Setup

- [ ] Add `mjml` (and optionally `@types/mjml`) to package.json
- [ ] Create `/lib/reactivate/templates/` directory structure:
  ```
  /lib/reactivate/templates
    /sections      (MJML partials)
    /recipes       (MJML compositions)
    compiler.ts    (section + recipe → HTML)
  ```
- [ ] Implement `compileMjmlToHtml(mjml: string): string`
- [ ] Add build/compile script or runtime compile

**Deliverable:** MJML can be compiled to HTML at runtime.

---

### Milestone 2.2: Core Section Implementations

Implement 8 MVP sections as MJML partials (or TS functions returning MJML). Each accepts slot inputs.

| Section | Slots | Status |
|---------|-------|--------|
| `logo_header` | logo_url, brand_name | |
| `hero` | headline, subheadline, hero_image_url?, cta_text, cta_url | |
| `intro_text` | body | |
| `benefits_list` | section_headline?, bullets[] (max 3) | |
| `testimonial` | testimonial_quote, testimonial_author | |
| `objection_block` | headline?, bullets[], cta_text, cta_url | |
| `survey_cta` | body, cta_text, cta_url | |
| `footer` | company_address, unsubscribe_url, preferences_url | |

- [ ] Implement each section as `renderSectionMjml(sectionId, slots): string`
- [ ] Reference: [MJML email-templates](https://github.com/mjmlio/email-templates), [Easy Email](https://github.com/Easy-Email-Pro/email-templates), [Cerberus](https://github.com/emailmonday/Cerberus)

**Deliverable:** 8 sections render MJML given slots. No HTML output yet.

---

### Milestone 2.3: Recipe Compiler

- [ ] For each recipe, compose sections in order
- [ ] `compileRecipe(recoveryType, slots): string` — assemble MJML → compile to HTML
- [ ] Ensure compiled HTML < 100 KB, minimal nesting
- [ ] Support `subject` and `preheader` in output (preheader in `<meta name="preheader">` or invisible div)

**Deliverable:** `compileRecipe('product_interest', slots)` produces valid, lightweight HTML.

---

## Phase 3: Slot Schema & Data Model

**Goal:** Unify content into a slot schema. Map existing fields (first_name, personalized_content, cta_*) into new schema.

### Milestone 3.1: Slot Schema Definition

- [ ] Define `EmailSlots` TypeScript interface per `email_templates.md`:
  ```ts
  interface EmailSlots {
    subject: string;
    preheader: string;
    headline: string;
    subheadline: string;
    body: string;
    bullets: string[];
    testimonial_quote: string;
    testimonial_author: string;
    cta_text: string;
    cta_url: string;
    secondary_cta_text?: string;
    secondary_cta_url?: string;
    offer_text?: string;
    logo_url?: string;
    brand_name?: string;
    company_address: string;
    unsubscribe_url: string;
    preferences_url?: string;
    first_name: string;      // keep for backward compat
    // pixel variable overrides
    [key: string]: string | string[] | undefined;
  }
  ```
- [ ] Map legacy `TemplateSlots` → `EmailSlots` (e.g. personalized_content → body, cta_label → cta_text)
- [ ] Ensure `sendCampaignEmail` builds `EmailSlots` from contact + KB + AI + campaign config

**Deliverable:** Single slot schema used by all recipes and sections.

---

### Milestone 3.2: Store Slot Defaults on Template

- [ ] Add `slot_defaults` JSONB column to `rt_email_templates`
- [ ] Store user-editable defaults: headline, subheadline, cta_text, logo_url, etc.
- [ ] At send time: merge slot_defaults + AI-generated + contact variables
- [ ] **Migration:** `020_slot_defaults.sql` (or extend `variable_mappings` migration)

**Deliverable:** Templates can store default slot values. Campaign sends merge defaults with dynamic data.

---

## Phase 4: Templates UI — Recovery-First Flow

**Goal:** Replace current "Generate Copy → Save" flow with "Choose recovery type → Preview → Light customization → Save".

### Milestone 4.1: Step 1 — Recovery Type Selector

- [ ] Add prominent "Choose recovery email type" as first step
- [ ] Show description for each type (e.g. "For product page visitors who didn’t convert")
- [ ] Auto-select matching recipe; show section list ("This email includes: logo, hero, benefits, footer")
- [ ] Keep KB selection and query for AI copy (used to fill `body`, `bullets`, etc.)

**Deliverable:** User selects recovery type before any content config.

---

### Milestone 4.2: Step 2 — Auto-Generated Preview

- [ ] After recovery type selected: generate preview using recipe + sample/retrieved slots
- [ ] Reuse existing `copy-with-retrieval` for `body` and bullets (map to slots)
- [ ] New API: `POST /api/reactivate/test/recipe-preview` — accepts `recovery_type`, `knowledge_bank_id`, `query`; returns `{ html, subject, preheader, slots_used }`
- [ ] Display preview in Templates UI (same style as current email preview panel)
- [ ] Show which recipe/sections were used

**Deliverable:** User sees auto-generated email preview based on recovery type + KB.

---

### Milestone 4.3: Step 3 — Light Customization Panel

- [ ] Add "Customize" section with minimal controls:
  - Logo URL
  - Primary CTA text
  - Primary CTA URL
  - Hero image on/off (if hero supports it)
  - Optional proof on/off (testimonial/social proof — where recipe supports)
  - Brand colors (optional; store in template for future theming)
- [ ] Do **not** expose raw section reordering or section picker in MVP
- [ ] Customization updates preview in real time (or on "Refresh preview")

**Deliverable:** User can tweak logo, CTA, and a few options. Preview updates.

---

### Milestone 4.4: Save Template with Recipe Metadata

- [ ] On "Save as template": persist `recovery_type`, `slot_defaults`, `template_id` (recipe id)
- [ ] Keep existing fields: `name`, `knowledge_bank_id`, `copy_prompt`, `subject_template`, `query_hint`, `variable_mappings`
- [ ] `template_id` becomes recipe id (e.g. `product_interest`, `reminder`) instead of `minimal_recovery`
- [ ] Ensure Campaign creation still works with new template shape

**Deliverable:** Saved templates store recovery type and slot defaults. Campaigns can use them.

---

## Phase 5: Send Pipeline Integration

**Goal:** Campaign sends use recipes and slot schema.

### Milestone 5.1: Slot Resolution in sendCampaignEmail

- [ ] Build `EmailSlots` in `sendCampaignEmail`:
  - From contact: first_name, pixel variables (company_name, job_title, etc.)
  - From template: slot_defaults, subject, preheader, cta_text, cta_url, logo_url
  - From AI: body, bullets, testimonial (if applicable) via `generateCopy` + retrieval
- [ ] Map AI output to slots (e.g. copy → body, structured output → bullets)
- [ ] Call `compileRecipe(template.recoveryType, slots)` instead of `renderTemplate()`
- [ ] Ensure `unsubscribe_url`, `company_address` are always set

**Deliverable:** Campaign sends produce recipe-based HTML with correct slots.

---

### Milestone 5.2: Template Preview & Test Email

- [ ] Update `GET /api/reactivate/email-templates/:id/preview` to use recipe compiler
- [ ] Update `POST /api/reactivate/test/send-test-email` to accept `recovery_type` + slots
- [ ] Templates page "Preview" and "Send test email" use new pipeline

**Deliverable:** Preview and test send use recipe system. No regression.

---

## Phase 6: Polish & Extensibility

**Goal:** Refinements and prep for future enhancements.

### Milestone 6.1: Preheader Support

- [ ] Add `preheader` to slot schema and template storage
- [ ] Ensure preheader is injected into HTML (standard pattern: hidden div or meta)
- [ ] UI: optional preheader field when creating/editing template

**Deliverable:** Preheader improves open rates. Visible in preview.

---

### Milestone 6.2: AI Slot Mapping

- [ ] Map `generateCopy` output to slots (e.g. "2–4 sentences" → body, "3 bullets" → bullets)
- [ ] Optional: structured output / JSON mode for slot extraction
- [ ] Ensure `copy_prompt` placeholders ({{first_name}}, {{company_name}}, etc.) still work

**Deliverable:** AI-generated copy populates the right slots automatically.

---

### Milestone 6.3: Backward Compatibility

- [ ] Keep `minimal_recovery` as fallback for templates created before recipe migration
- [ ] Migration path: old templates default to `recovery_type: product_interest` or `reminder`
- [ ] Campaign creation: if template has no `recovery_type`, use legacy `renderTemplate()`

**Deliverable:** Existing templates and campaigns continue to work.

---

## Summary Table

| Phase | Milestones | Key Deliverables |
|-------|------------|------------------|
| 1 | 1.1, 1.2 | Recovery type selection, recipe mapping |
| 2 | 2.1, 2.2, 2.3 | MJML setup, 8 sections, recipe compiler |
| 3 | 3.1, 3.2 | Slot schema, slot_defaults storage |
| 4 | 4.1–4.4 | Recovery-first UI, preview, customization, save |
| 5 | 5.1, 5.2 | Send pipeline, preview/test integration |
| 6 | 6.1–6.3 | Preheader, AI slot mapping, backward compat |

---

## Success Criteria (from email_templates.md)

- [ ] Produces lightweight responsive HTML (< 100 KB)
- [ ] Supports reusable section composition
- [ ] Keeps recipes simple and conversion-focused
- [ ] User chooses email type, not raw template
- [ ] Supports future AI slot filling without changing rendering architecture

---

## Optional Later (Post-MVP)

- feature_grid, social_proof, offer_banner, secondary_cta sections
- Educational recovery, Offer/urgency recovery types
- A/B variant recipes
- Optional section insertion (e.g. testimonial on/off)
- Per-brand styling themes
- Automatic recipe selection by segment/stage
