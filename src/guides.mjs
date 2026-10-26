/**
 * Reference guides.
 *
 * These pages answer a question rather than sell a product — "how much
 * essential oil in a diffuser" is a far bigger search than any product name,
 * and the site had nothing for it.
 *
 * The prose lives here. Every table of oils on these pages is generated from
 * the `safety` data on each product, so a guide cannot drift out of step with
 * the catalogue: add an oil with `safety.pregnancy` and it appears on the
 * pregnancy page automatically.
 *
 * `table` names the derived block the build should insert at that point.
 *
 * Same rule as everywhere: describe how oils are used, never what they treat.
 */

export const guidePages = [
  {
    slug: "dilution-chart",
    title: "Essential Oil Dilution Chart",
    nav: "Dilution chart",
    excerpt:
      "What the percentages mean, how many drops that actually is, and the oils in our range that need a lower ceiling than usual.",
    description:
      "A plain dilution chart for essential oils: percentages, drops per teaspoon and per 30 ml, and the specific oils that need a lower limit.",
    updated: "2026-10-26",
    body: [
      ["p", "Nearly every problem people have with essential oils is a dosing problem. Not the wrong oil, not a fake oil — simply too much of it. This page is the reference we point people to."],
      ["h2", "What a percentage means"],
      ["p", "Dilution is the proportion of essential oil to carrier oil by volume. You do not need to measure precisely, because there is a shortcut worth memorising: <strong>one drop in one teaspoon (5 ml) of carrier is roughly 1%</strong>."],
      ["table:dilution"],
      ["note", "Half a drop is not a practical measurement. For anything needing 0.5% or less, make up 30 ml at a time rather than trying to split drops."],
      ["h2", "Oils that need a lower ceiling"],
      ["p", "Most oils are comfortable at 2% on the body. These are the ones in our range that are not, with the limit for each. Every figure here is the same one printed on that oil's own page."],
      ["table:maxDilution"],
      ["h2", "Diffusing is a different question"],
      ["p", "Percentages apply to skin. In a diffuser the guidance is simpler: four to six drops scents an ordinary room, and more does not scent it better. Past about six drops most people stop registering the increase at all."],
      ["p", "Olfactory fatigue sets in within minutes — your nose stops reporting a smell that has not changed — which is exactly when people add more. The person who walks in half an hour later gets the full force of it."],
      ["h2", "Four things people get wrong"],
      ["ol", [
        "<strong>Applying neat.</strong> \"It is natural, so it is gentle\" is the most expensive assumption in this hobby. Neat application is how most people develop a permanent sensitivity, and sensitisation does not wear off.",
        "<strong>Treating every oil the same.</strong> Lavender at 2% is unremarkable. Clove at 2% is a problem. The dilution depends on the oil, not the task.",
        "<strong>Scaling a blend by eye.</strong> Doubling a recipe means doubling the carrier too. People routinely double the essential oil and leave the carrier where it was.",
        "<strong>Using an old bottle.</strong> Oxidised oils irritate more than fresh ones at the same dilution — citrus and tea tree especially.",
      ]],
      ["h2", "Start lower than you think"],
      ["p", "There is no prize for using more. A 1% blend you can wear daily is worth more than a 4% blend that leaves you itchy and wary of the whole thing. If you are unsure, start at 1%, patch-test on the inside of your forearm, and wait 24 hours."],
    ],
  },

  {
    slug: "phototoxic-oils",
    title: "Which Essential Oils Are Phototoxic",
    nav: "Phototoxic oils",
    excerpt:
      "The one essential oil hazard that can leave marks lasting months — and it comes almost entirely from citrus oils people assume are harmless.",
    description:
      "Which essential oils are phototoxic, what the reaction actually is, and the safe limit for each oil on skin that will see sunlight.",
    updated: "2026-10-26",
    body: [
      ["p", "Most essential oil safety is about irritation: use less, dilute more, patch-test. Phototoxicity is different. It is the one hazard where you can do everything right, feel nothing at the time, and still end up with dark patches that take months to fade."],
      ["p", "It also comes from the oils people assume are safest. Citrus smells friendly. Lemon, bergamot and lime do not read as risky the way clove does."],
      ["h2", "What is actually happening"],
      ["p", "Certain cold-pressed citrus oils contain furocoumarins — bergapten is the one usually named. On skin these react with UV light. The reaction needs both: the oil alone is fine, sunlight alone is fine, together they can burn and leave lasting pigmentation."],
      ["p", "The timing is what catches people out. You apply a blend in the morning, notice nothing, go outside at lunch, and the reaction develops hours later. Nothing about it points back at the bottle."],
      ["h2", "The oils, and their limits"],
      ["p", "These are the phototoxic oils in our range. The limit is the maximum on skin that will see direct sun within about twelve hours."],
      ["table:phototoxic"],
      ["p", "Two patterns are worth noticing. <strong>Steam-distilled citrus oils are not phototoxic</strong> — distillation leaves the furocoumarins behind. And <strong>sweet orange and mandarin are the exceptions</strong> among cold-pressed oils, which is why we recommend those for daytime skin blends."],
      ["h2", "How to use them anyway"],
      ["ul", [
        "Diffusing is unaffected. This is a skin-and-sunlight reaction; it has nothing to do with scenting a room.",
        "Use them on skin in the evening, or on skin that stays covered.",
        "Wash the area before going out if you have applied something citrus-heavy.",
        "Rinse-off products are far lower risk than leave-on ones — the contact time is short.",
        "Look for FCF or bergapten-free bergamot if you specifically want a daytime skin blend.",
      ]],
      ["note", "Twelve hours is the rough window. If skin will see direct sun within half a day, treat the limits above as firm."],
    ],
  },

  {
    slug: "essential-oils-and-pregnancy",
    title: "Essential Oils to Avoid in Pregnancy",
    nav: "Pregnancy & children",
    excerpt:
      "The oils in our range commonly advised against during pregnancy, around babies and young children, and around cats and dogs.",
    description:
      "Which essential oils to avoid during pregnancy, around young children and around pets, with the specific oils in the Sarvha range listed.",
    updated: "2026-10-26",
    body: [
      ["p", "This page exists because the honest answer is longer than a yes or no, and because the lists below are easier to read in one place than spread across fifty product pages."],
      ["note", "We are not doctors and this is not medical advice. If you are pregnant, breastfeeding, or buying for a child, speak to a doctor or a qualified aromatherapist who knows your circumstances. Treat what follows as a starting point for that conversation."],
      ["h2", "Why pregnancy is treated differently"],
      ["p", "Some essential oil constituents are structurally similar to hormones, or are simply poorly studied in pregnancy. Caution in the industry is mostly precautionary rather than evidence of harm — but precaution is the right posture when the evidence is thin."],
      ["h2", "Oils we would avoid during pregnancy"],
      ["table:pregnancy"],
      ["h2", "Around babies and young children"],
      ["p", "The usual concern is 1,8-cineole and menthol, which can affect breathing in the very young. These are the oils in our range we would keep out of a nursery."],
      ["table:children"],
      ["h2", "Around cats and dogs"],
      ["p", "Pets metabolise these compounds differently, and cats particularly poorly. Vapour in a closed room counts — it is not only about direct contact."],
      ["table:pets"],
      ["h2", "Nut allergies"],
      ["p", "Two of our carrier oils are pressed from tree nuts. Jojoba comes from a shrub seed rather than a nut and is the straightforward substitute."],
      ["table:nutAllergy"],
      ["h2", "What this list is not"],
      ["p", "An oil not appearing above is not a clearance. It means we have no specific caution recorded for it, which is a different claim. Dilution, patch testing and ventilation still apply to everything we sell."],
    ],
  },

  {
    slug: "how-to-use-a-diffuser",
    title: "How to Use an Essential Oil Diffuser",
    nav: "Using a diffuser",
    excerpt:
      "How many drops, how long to run it, which oils suit a diffuser and which do not, and the mistakes that waste most of a bottle.",
    description:
      "A practical guide to using an essential oil diffuser: how many drops, how long to run it, cleaning, and which oils suit diffusing.",
    updated: "2026-10-26",
    body: [
      ["p", "A diffuser is the easiest way to use essential oils and the hardest to get wrong — but people manage, almost always by using too much."],
      ["h2", "How many drops"],
      ["p", "Four to six drops for an ordinary room, in a standard ultrasonic diffuser filled to its line. A small bathroom wants two or three. A large open-plan room might take eight."],
      ["p", "That is the whole answer. More drops do not produce more scent in any way you will notice — they produce a heavier room that other people notice when they walk in."],
      ["h2", "How long to run it"],
      ["ul", [
        "Thirty to sixty minutes, then let it stop.",
        "Ventilate between sessions rather than topping up.",
        "If you have stopped noticing the smell, that is olfactory fatigue, not a weak dose.",
        "Running one overnight mostly wastes oil, and is not advisable with children or pets in the room.",
      ]],
      ["h2", "Which oils suit diffusing"],
      ["p", "Nearly all of them, but they behave differently. Citrus is bright and gone within the hour. Woods and roots are slow and will still be noticeable tomorrow. Absolutes are so concentrated that one drop is a whole session."],
      ["p", "A rough rule for blending: two drops of something slow underneath, three or four of something bright on top."],
      ["h2", "Oils to keep out of a diffuser"],
      ["p", "Phototoxicity is irrelevant here, but these are the oils we would not diffuse around babies, young children or pets."],
      ["table:diffuserCaution"],
      ["h2", "Cleaning it"],
      ["ol", [
        "Empty any remaining water after each session rather than leaving it to sit.",
        "Wipe the reservoir with a cloth and a drop of white vinegar weekly.",
        "Run it with plain water for five minutes to clear the vinegar.",
        "Descale properly every month or so if you are in a hard-water area, which most of northern India is.",
      ]],
      ["note", "Oil left standing in a reservoir oxidises and leaves a film that dulls the next blend. Emptying it is the single habit that makes the most difference."],
    ],
  },
];
