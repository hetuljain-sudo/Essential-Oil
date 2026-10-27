/**
 * Guides.
 *
 * `draft: true` keeps a guide in this file and out of the site: it is not
 * built, not linked and not in the sitemap, but nothing about it is lost.
 * Every guide is currently shelved that way. Publishing one again is a
 * matter of deleting its `draft: true` — the index page, the nav item and
 * the footer links all come back on their own, because they are derived
 * from `liveGuides` below rather than written out by hand.
 */

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
    draft: true,
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
    draft: true,
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
    draft: true,
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
    draft: true,
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

  {
    draft: true,
    slug: "why-we-dont-say-therapeutic-grade",
    title: "Why we won't say \"therapeutic grade\"",
    nav: "Therapeutic grade",
    excerpt: "It appears on bottles everywhere and it means nothing. No body awards it, no standard defines it, and no test can confirm it. Here is what to look for instead.",
    description: "It appears on bottles everywhere and it means nothing. No body awards it, no standard defines it, and no test can confirm it. Here is what to look for inst",
    updated: "2026-10-26",
    body: [
      ["p","Walk down any aisle selling essential oils and you will see the same phrase on half the bottles: therapeutic grade. Sometimes certified therapeutic grade. Occasionally, with real confidence, clinical grade."],
      ["p","None of it means anything. There is no body that awards the designation, no standard that defines it, and no laboratory test that can confirm a bottle qualifies. A company can print it on a label because it decided to."],
      ["h2","Why the phrase exists"],
      ["p","It exists because buyers reasonably want a quality signal, and the industry has no consumer-facing one to give. Food has FSSAI. Organic produce has certifying bodies. Essential oils sit in a regulatory gap — they are not food, not cosmetics in most uses, and not medicines. So the gap got filled with marketing."],
      ["p","That is not to say every brand using the phrase is cutting their oils. Most are not. But the phrase itself tells you nothing about whether they are, which makes it useless for the one job you want it to do."],
      ["h2","What is actually worth looking at"],
      ["p","Four things on a label tell you more than any grading claim."],
      ["ul",["<strong>The botanical name.</strong> \"Lavender\" covers at least three different plants at three different prices. Lavandula angustifolia is the one most people mean. If a bottle will not tell you the species, ask why.","<strong>The country of origin.</strong> Not because one country is better, but because a supplier who knows where an oil came from is a supplier with a real chain behind them.","<strong>The extraction method.</strong> Steam distilled, cold pressed, CO2 extracted or solvent extracted are genuinely different products with different characteristics and prices.","<strong>The part of the plant.</strong> Cinnamon bark and cinnamon leaf are not the same oil and are not equally safe. Clove bud, leaf and stem differ in both quality and harshness."]],
      ["note","A bottle that gives you all four is telling you something checkable. A bottle that gives you a grading phrase instead is telling you something that cannot be checked at all."],
      ["h2","The price question"],
      ["p","Price is an imperfect signal but not a useless one. Rose, sandalwood, melissa and Roman chamomile are expensive because of yield — the volume of plant material needed per bottle is enormous, and no amount of efficient production changes that."],
      ["p","So when every oil on a shelf costs roughly the same, something is wrong. Either the cheap ones are overpriced, or the expensive ones are not what they say. A range with a genuine spread from a few hundred rupees to several thousand is a range that is probably being honest about what is in each bottle."],
      ["h2","What we say instead"],
      ["p","Our oils are pure and undiluted, with no synthetic fragrance or fillers. We ask our suppliers for the documentation that accompanies each batch, and we will share it if you ask."],
      ["p","What we will not do is dress that up into something grander. We are a young business with a deliberately small range, and we would rather tell you precisely what we know than invent a certification to stand behind. If you want to know exactly what we hold on a particular oil, ask us and we will tell you straight."],
    ],
  },

  {
    draft: true,
    slug: "how-to-read-an-essential-oil-label",
    title: "How to read an essential oil label",
    nav: "Reading a label",
    excerpt: "Two bottles both say lavender. One costs three times the other. The label usually tells you why — if you know which four things to look at.",
    description: "Two bottles both say lavender. One costs three times the other. The label usually tells you why — if you know which four things to look at.",
    updated: "2026-10-26",
    body: [
      ["p","The common name on the front of a bottle is the least informative thing about it. \"Lavender\", \"cedarwood\", \"chamomile\" and \"eucalyptus\" each cover several unrelated plants with different scents, different safety profiles and wildly different prices."],
      ["p","Everything useful is in the small print. Here is what to look for, roughly in order of how much it tells you."],
      ["h2","1. The botanical name"],
      ["p","This is the single most useful thing on a label, because it is the only part that identifies the plant unambiguously."],
      ["ul",["<strong>Lavender</strong> — Lavandula angustifolia is true lavender. Lavandula x intermedia is lavandin, a higher-yield hybrid, much cheaper and sharper, used widely in soaps and detergents.","<strong>Chamomile</strong> — Chamaemelum nobile is Roman, pale and apple-sweet. Matricaria recutita is German, deep blue and herbaceous. Not interchangeable.","<strong>Cedarwood</strong> — Cedrus atlantica is a true cedar. Juniperus virginiana is a juniper. They smell quite different and the second is far cheaper.","<strong>Sandalwood</strong> — Santalum album is Indian sandalwood. Santalum spicatum is Australian. Amyris balsamifera is not sandalwood at all, though it is often sold as one."]],
      ["h2","2. The part of the plant"],
      ["p","Where a difference exists, it usually matters a great deal."],
      ["p","Cinnamon bark oil and cinnamon leaf oil come from the same tree and behave entirely differently — the bark is a severe skin sensitiser, the leaf is manageable. Clove bud is sweeter and rounder than clove leaf or stem. Bitter orange yields three distinct oils depending on whether you press the peel, distil the flowers or distil the leaves."],
      ["p","A label that says only \"cinnamon oil\" is leaving out the part that determines whether you can safely put it on skin."],
      ["h2","3. The extraction method"],
      ["ul",["<strong>Steam distilled</strong> — the standard for most essential oils. Heat and steam carry the volatile compounds across.","<strong>Cold pressed</strong> — used for citrus peel. Keeps the bright top notes, but also keeps the furocoumarins that make some citrus oils phototoxic.","<strong>CO2 extracted</strong> — pressurised carbon dioxide as a solvent. Closer to the smell of the raw plant, usually more expensive.","<strong>Solvent extracted</strong> — produces absolutes, as with jasmine and rose. Not technically essential oils, and some solvent residue is inherent to the process."]],
      ["h2","4. The chemotype, where it exists"],
      ["p","Some species produce meaningfully different oils depending on where and how they grew. Rosemary is the one most people meet: the 1,8-cineole type is the one used in hair and scalp routines, while camphor and verbenone types smell and behave differently."],
      ["p","Thyme, basil and eucalyptus all have chemotypes too. If a label specifies one, that is a sign the supplier knows what they are selling."],
      ["h2","What you can ignore"],
      ["p","Grading phrases — therapeutic grade, clinical grade, aromatherapy grade — are not awarded by anyone and cannot be verified. The same goes for \"100% pure\" on its own: it is a claim every brand makes, including those whose oils are not."],
      ["note","A label that gives you species, plant part, extraction method and origin is making four checkable statements. A label that gives you a grading phrase is making one that cannot be checked at all."],
      ["h2","A reasonable rule"],
      ["p","Buy from people who will answer a specific question with a specific answer. If you ask where an oil came from and get a region, a method and a species, that is a supply chain someone is actually keeping track of. If you get a paragraph about purity and quality commitment, you have learned nothing."],
    ],
  },
];

/** The guides that are actually published. Everything guide-shaped on the
 *  site derives from this, so there is no list to keep in step. */
export const liveGuides = guidePages.filter((g) => !g.draft);
