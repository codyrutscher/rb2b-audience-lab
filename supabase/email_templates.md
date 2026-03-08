Technical Document
Modular Recovery Email Template System
Goal: Use simple reusable sections to generate high-converting recovery emails
Objective

Build a modular email template engine specifically for recovery emails.

Recovery emails are sent to visitors who:

visited the site

showed intent

did not buy / book / complete the desired action

The system should:

use a small set of reusable email sections

automatically assemble a high-converting layout based on recovery email type

keep HTML lightweight for deliverability

support AI-generated copy later, but work with static slot-based content now

This system should not rely on large fixed templates.
It should rely on simple sections / blocks that can be assembled into effective recovery emails.

Core Product Principle

Do not build a library of dozens of rigid templates.

Build:

email_type
→ choose layout recipe
→ assemble sections
→ inject content into slots
→ compile HTML

This will:

make the UX easier

improve maintainability

standardize deliverability

allow future AI generation without redesigning templates

Why This Approach Converts Better

High-converting recovery emails are usually:

shorter

more focused

less visually noisy

single-goal

built around one psychological job:

remind

reassure

prove

prompt action

Instead of “beautiful newsletter templates,” the system should generate conversion-first layouts.

Recommended Rendering Stack

Use MJML as the template framework.

Reasons:

generates email-client-safe HTML

handles Outlook/Gmail compatibility

easier to maintain than raw HTML

supports reusable section partials

Pipeline:

section blocks
→ layout recipe
→ fill slots
→ compile MJML
→ send HTML via Resend
Open Source Resources for Base Templates / Patterns

Use these repos as references for section patterns and responsive structures.

1. MJML official templates

Use as primary reference for email-safe layouts.

https://github.com/mjmlio/email-templates

2. Easy Email templates

Use for reusable section ideas and SaaS/email layout inspiration.

https://github.com/Easy-Email-Pro/email-templates

3. Cerberus

Use for battle-tested responsive email layout patterns.

https://github.com/emailmonday/Cerberus

These repos should be used as:

structural inspiration

responsive layout references

fallback compatibility patterns

They should not be exposed directly to end users.

Recovery Email Types To Support

The system should auto-generate emails based on recovery type.

Start with these 5 core recovery types:

Reminder

Product Interest

Social Proof

Objection Handling

Survey / Qualification

Optional later:
6. Educational recovery
7. Offer / urgency recovery

The Section-Based Architecture

Build the system around reusable sections.

Core section library
1. logo_header

Purpose:

brand recognition

simple top-of-email structure

Contents:

logo

optional divider

2. hero

Purpose:

primary headline

immediate context

one CTA

Contents:

headline

subheadline

hero image (optional)

CTA button

3. intro_text

Purpose:

short reminder or explanation

useful for survey or reminder emails

Contents:

1–2 short paragraphs

4. benefits_list

Purpose:

explain why the visitor should return

ideal for product or service recovery

Contents:

section headline (optional)

3 bullets maximum

5. feature_grid

Purpose:

show product or feature highlights

use sparingly for recovery emails

Contents:

2 or 3 tiles

each tile has:

title

short description

image/icon (optional)

6. testimonial

Purpose:

trust and proof

especially useful for pricing / consideration stage

Contents:

quote

person/company attribution

7. social_proof

Purpose:

logos, trust badges, short stats

Contents:

customer logos or trust text

optional stat row

Keep minimal.

8. objection_block

Purpose:

answer a common hesitation

especially useful for pricing or evaluation-stage visitors

Contents:

short heading

2–3 objection-handling bullets

CTA

9. survey_cta

Purpose:

short qualification nudge

Contents:

explanation

CTA button

10. offer_banner

Purpose:

urgency, discount, promo, trial

Contents:

short offer line

CTA

Use only when explicitly configured.

11. secondary_cta

Purpose:

optional secondary action

should be lightweight and text-based

Contents:

text link only

12. footer

Required for deliverability and compliance.

Contents:

company address

unsubscribe link

preferences link

optional support email

Recommended Layout Recipes

Do not let the user choose raw section combinations initially.

Instead create layout recipes based on recovery type.

Layout Recipe 1: Reminder

Use for:

light browse abandonment

generic revisit nudges

Sections:

logo_header
hero
intro_text
footer

Characteristics:

very lightweight

minimal text

single CTA

low pressure

Layout Recipe 2: Product Interest

Use for:

product page visitors

service page visitors

feature page visitors

Sections:

logo_header
hero
benefits_list
footer

Characteristics:

strongest all-purpose recovery layout

simple and high converting

works for SaaS and ecommerce

Layout Recipe 3: Social Proof Recovery

Use for:

mid-intent visitors

comparison/pricing/evaluation stage

Sections:

logo_header
hero
testimonial
footer

Characteristics:

strong for trust building

reduces hesitation

good for higher-ticket offers

Layout Recipe 4: Objection Handling

Use for:

pricing page visitors

hesitant buyers

evaluation-stage visitors

Sections:

logo_header
hero
objection_block
footer

Characteristics:

should answer one core hesitation

keep copy tight

avoid long-form sales language

Layout Recipe 5: Survey / Qualification

Use for:

incomplete surveys

lead qualification

“finish setup” or “book now” prompts

Sections:

logo_header
intro_text
survey_cta
footer

Characteristics:

very short

direct

one CTA only

Shopify-Style Recovery Principles To Follow

Use these principles when building all recipes:

1. One primary CTA

Each email should have:

exactly one main button

optional secondary text link only if necessary

Too many CTAs reduce recovery performance.

2. Keep emails short

Recovery emails should feel like:

a reminder

a helpful nudge

a quick re-entry point

Not a full newsletter.

3. Use a strong top section

Above the fold should usually contain:

clear headline

immediate context

CTA

The user should understand the email within seconds.

4. Put the most important message first

Do not force users to scroll for:

relevance

product name

CTA

5. Use proof sparingly

One testimonial or one trust signal is enough.

Do not overload recovery emails with:

too many logos

too many stats

too much social proof

Slot-Based Content Model

The content generator should populate slots, not HTML.

Global slot schema
{
  "subject": "",
  "preheader": "",
  "headline": "",
  "subheadline": "",
  "body": "",
  "bullets": [],
  "testimonial_quote": "",
  "testimonial_author": "",
  "cta_text": "",
  "cta_url": "",
  "secondary_cta_text": "",
  "secondary_cta_url": "",
  "offer_text": ""
}

Not every section uses every slot.

Each section should only read the slots it needs.

Section Interfaces
logo_header

Inputs:

logo_url

brand_name

hero

Inputs:

headline

subheadline

hero_image_url optional

cta_text

cta_url

intro_text

Inputs:

body

benefits_list

Inputs:

bullets[]

Limit to max 3 bullets.

testimonial

Inputs:

testimonial_quote

testimonial_author

objection_block

Inputs:

headline optional

bullets[]

cta_text

cta_url

survey_cta

Inputs:

body

cta_text

cta_url

footer

Inputs:

company_address

unsubscribe_url

preferences_url

Technical Requirements
1. Build sections as reusable MJML partials

Recommended structure:

/templates
  /sections
    logo_header.mjml
    hero.mjml
    intro_text.mjml
    benefits_list.mjml
    feature_grid.mjml
    testimonial.mjml
    social_proof.mjml
    objection_block.mjml
    survey_cta.mjml
    offer_banner.mjml
    secondary_cta.mjml
    footer.mjml

  /recipes
    reminder.mjml
    product_interest.mjml
    social_proof_recovery.mjml
    objection_recovery.mjml
    survey_recovery.mjml
2. Recipes should compose sections

Each recipe should be a top-level MJML file that imports/includes sections in order.

Example:

product_interest recipe:
logo_header
hero
benefits_list
footer
3. Section order should be deterministic

Do not dynamically reorder sections at runtime in V1.

Only vary by:

recipe

content slots

This keeps output stable and easier to test.

4. Allow optional sections later

In V2, recipes can support optional inserts:

testimonial

offer banner

secondary CTA

But MVP should keep recipes fixed.

Deliverability Requirements

The template system must prioritize inbox placement.

HTML constraints

total compiled HTML under 100 KB

minimal nested wrappers

minimal CSS

no JavaScript

no external fonts required

Content/image balance

prefer text-heavy layouts

avoid image-only hero sections

maintain roughly 70% text / 30% image

Links

one primary CTA button

optional one secondary text link

avoid too many links in body copy

Footer

Always include:

unsubscribe

physical address

preferences/manage settings link

Subject / preheader

Every recipe must support:

subject

preheader

Preheader should complement subject, not repeat it.

Mobile

Templates must render cleanly on mobile.
Buttons must be tap-friendly.

UX Recommendation

The end user should not choose from dozens of templates.

Instead, the UI should ask for:

Step 1

Choose recovery email type:

Reminder

Product Interest

Social Proof

Objection Handling

Survey / Qualification

Step 2

Show an auto-generated preview using the matching recipe.

Step 3

Allow very light customization:

logo

colors

CTA text

hero image on/off

optional proof on/off where supported

This keeps the experience simple and high-converting.

Why This UX Is Better

Users do not know how to choose a “template.”

They do understand:

“I want a reminder email”

“I want a pricing objection email”

“I want a survey completion email”

The system should translate that intent into:

the right recipe

the right sections

the right structure

MVP Recommendation

Implement these first:

Sections

logo_header

hero

intro_text

benefits_list

testimonial

objection_block

survey_cta

footer

Recipes

reminder

product_interest

social_proof_recovery

objection_recovery

survey_recovery

That is enough to produce a strong recovery email system.

Success Criteria

The system is successful if it:

produces lightweight responsive HTML

supports reusable section composition

keeps recipes simple and conversion-focused

makes the user choose email type, not raw template

supports future AI slot filling without changing the rendering architecture

Future Enhancements

Later additions can include:

A/B variant recipes

optional urgency banner

dynamic section insertion

AI-generated slot content

automatic recipe selection based on segment/stage

per-brand styling themes