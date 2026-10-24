/**
 * Blog posts. The build writes one page per entry plus an index.
 *
 * `body` is a list of blocks. Supported kinds:
 *   ["p",  "text"]              paragraph
 *   ["h2", "text"]              section heading
 *   ["ul", ["item", "item"]]    bullets
 *   ["ol", ["item", "item"]]    numbered steps
 *   ["note", "text"]            a highlighted aside
 *   ["table", [header], [rows]] a simple table
 *
 * `related` lists product ids, shown as cards at the end of the post.
 *
 * `draft: true` keeps a post out of the build. The four entries below are
 * unpublished drafts written as examples of shape — replace or delete them.
 *
 * Reading time is calculated from the word count — don't set it by hand.
 *
 * Keep to the same rule as the product pages: describe how oils smell and how
 * people use them, never what they treat.
 */

export const posts = [
  {
    draft: true,
    slug: "how-much-essential-oil-is-too-much",
    title: "How much essential oil is too much?",
    excerpt:
      "Nearly every problem people have with essential oils is a dosing problem. Here is what the percentages actually mean, and how to hit them without a pipette.",
    date: "2026-10-18",
    category: "Guides",
    related: ["jojoba", "lavender-fields", "sweet-almond"],
    body: [
      ["p", "If you take one thing from this journal, make it this: almost every bad experience people have with essential oils comes down to using too much. Not the wrong oil, not a fake oil — simply too many drops."],
      ["p", "It is an easy mistake, because the instinct is reasonable. If four drops of lavender smells nice, eight should smell nicer. In practice the scent flattens, the room becomes oppressive, and skin that would have been fine at 2% starts to react."],

      ["h2", "What a percentage actually means"],
      ["p", "Dilution is usually written as a percentage — 1%, 2%, 5%. That is the proportion of essential oil to carrier oil by volume. You do not need to measure anything precisely to get it right, because there is a shortcut worth memorising."],
      ["p", "One drop of essential oil in one teaspoon (5 ml) of carrier is roughly 1%. That single fact covers most of what you will ever need."],
      ["table", [
        ["Dilution", "Per teaspoon (5 ml)", "Per 30 ml bottle", "Typical use"],
        ["0.5%", "half a drop", "3 drops", "Clove, cinnamon, anything flagged as a sensitiser"],
        ["1%", "1 drop", "6 drops", "Face, sensitive skin, children over 6 with advice"],
        ["2%", "2 drops", "12 drops", "General body use — the everyday default"],
        ["3%", "3 drops", "18 drops", "Short-term, localised, on a small area"],
      ]],
      ["note", "Half a drop sounds absurd, and it is. For anything that needs 0.5% or less, make up 30 ml at a time instead of trying to split drops."],

      ["h2", "Diffusing is a different question"],
      ["p", "Dilution percentages apply to skin. In a diffuser you are dealing with air, and the honest guidance is much simpler: four to six drops scents an ordinary room, and more does not scent it better."],
      ["p", "Past about six drops, most people stop registering the increase at all. Olfactory fatigue sets in within minutes — your nose stops reporting a smell that has not changed — which is exactly the moment people add more. The person who walks in half an hour later gets the full force of it."],
      ["ul", [
        "Run a diffuser for 30 to 60 minutes, not continuously.",
        "Ventilate between sessions rather than topping up.",
        "If you have stopped noticing the smell, that is fatigue, not a weak dose.",
      ]],

      ["h2", "Where people go wrong"],
      ["ol", [
        "Applying neat. \"It is natural, so it is gentle\" is the single most expensive assumption in this hobby. Neat application is how most people develop a permanent sensitivity, and sensitisation does not wear off.",
        "Treating every oil the same. Lavender at 2% is unremarkable. Clove at 2% is a problem. The dilution depends on the oil, not on the task.",
        "Scaling up a blend by eye. If a recipe works at 30 ml, doubling it means doubling the carrier too — people routinely double the essential oil and keep the carrier the same.",
        "Using an old bottle. Oxidised oils are more irritating than fresh ones at the same dilution, particularly citrus and tea tree.",
      ]],

      ["h2", "Start lower than you think"],
      ["p", "There is no prize for using more. A 1% blend that you can wear every day is worth more than a 4% blend that leaves you itchy and wary. If you are unsure, start at 1%, patch-test on the inside of your forearm, and wait 24 hours before putting it anywhere else."],
      ["p", "Every product page on this site lists a dilution for that specific oil, and flags the ones that need a lower ceiling than usual. When in doubt, that number is the one to follow."],
    ],
  },

  {
    draft: true,
    slug: "why-we-dont-say-therapeutic-grade",
    title: "Why we won't say \"therapeutic grade\"",
    excerpt:
      "It appears on bottles everywhere and it means nothing. No body awards it, no standard defines it, and no test can confirm it. Here is what to look for instead.",
    date: "2026-10-12",
    category: "Buying well",
    related: ["frankincense-quiet", "lavender-fields", "sandalwood-mysore"],
    body: [
      ["p", "Walk down any aisle selling essential oils and you will see the same phrase on half the bottles: therapeutic grade. Sometimes certified therapeutic grade. Occasionally, with real confidence, clinical grade."],
      ["p", "None of it means anything. There is no body that awards the designation, no standard that defines it, and no laboratory test that can confirm a bottle qualifies. A company can print it on a label because it decided to."],

      ["h2", "Why the phrase exists"],
      ["p", "It exists because buyers reasonably want a quality signal, and the industry has no consumer-facing one to give. Food has FSSAI. Organic produce has certifying bodies. Essential oils sit in a regulatory gap — they are not food, not cosmetics in most uses, and not medicines. So the gap got filled with marketing."],
      ["p", "That is not to say every brand using the phrase is cutting their oils. Most are not. But the phrase itself tells you nothing about whether they are, which makes it useless for the one job you want it to do."],

      ["h2", "What is actually worth looking at"],
      ["p", "Four things on a label tell you more than any grading claim."],
      ["ul", [
        "<strong>The botanical name.</strong> \"Lavender\" covers at least three different plants at three different prices. Lavandula angustifolia is the one most people mean. If a bottle will not tell you the species, ask why.",
        "<strong>The country of origin.</strong> Not because one country is better, but because a supplier who knows where an oil came from is a supplier with a real chain behind them.",
        "<strong>The extraction method.</strong> Steam distilled, cold pressed, CO2 extracted or solvent extracted are genuinely different products with different characteristics and prices.",
        "<strong>The part of the plant.</strong> Cinnamon bark and cinnamon leaf are not the same oil and are not equally safe. Clove bud, leaf and stem differ in both quality and harshness.",
      ]],
      ["note", "A bottle that gives you all four is telling you something checkable. A bottle that gives you a grading phrase instead is telling you something that cannot be checked at all."],

      ["h2", "The price question"],
      ["p", "Price is an imperfect signal but not a useless one. Rose, sandalwood, melissa and Roman chamomile are expensive because of yield — the volume of plant material needed per bottle is enormous, and no amount of efficient production changes that."],
      ["p", "So when every oil on a shelf costs roughly the same, something is wrong. Either the cheap ones are overpriced, or the expensive ones are not what they say. A range with a genuine spread from a few hundred rupees to several thousand is a range that is probably being honest about what is in each bottle."],

      ["h2", "What we say instead"],
      ["p", "Our oils are pure and undiluted, with no synthetic fragrance or fillers. We ask our suppliers for the documentation that accompanies each batch, and we will share it if you ask."],
      ["p", "What we will not do is dress that up into something grander. We are a young business with a deliberately small range, and we would rather tell you precisely what we know than invent a certification to stand behind. If you want to know exactly what we hold on a particular oil, ask us and we will tell you straight."],
    ],
  },

  {
    draft: true,
    slug: "oils-you-shouldnt-wear-in-the-sun",
    title: "The oils you shouldn't wear in the sun",
    excerpt:
      "Phototoxicity is the one essential oil hazard that can leave marks lasting months — and it comes almost entirely from citrus oils people assume are harmless.",
    date: "2026-10-05",
    category: "Safety",
    related: ["bergamot", "grapefruit", "lemon-clarity"],
    body: [
      ["p", "Most essential oil safety advice is about irritation: use less, dilute more, patch-test first. Phototoxicity is different. It is the one hazard where you can do everything correctly, feel nothing at the time, and still end up with dark patches that take months to fade."],
      ["p", "It also comes from the oils people assume are the safest. Citrus smells friendly. Lemon, bergamot and grapefruit do not read as risky the way clove or cinnamon do."],

      ["h2", "What is actually happening"],
      ["p", "Certain cold-pressed citrus oils contain furocoumarins — bergapten is the one usually named. On skin, these compounds react with UV light. The reaction needs both: the oil alone is fine, and sunlight alone is fine, but together they can produce burning, blistering and long-lasting hyperpigmentation."],
      ["p", "The timing is what catches people out. You apply a blend in the morning, notice nothing, go outside at lunch, and the reaction develops hours later. Nothing about the experience points back at the bottle."],

      ["h2", "Which oils, and how much"],
      ["table", [
        ["Oil", "Phototoxic?", "Safe limit on sun-exposed skin"],
        ["Bergamot (cold-pressed)", "Yes — strongly", "0.4%"],
        ["Lemon (cold-pressed)", "Yes", "2%"],
        ["Grapefruit (cold-pressed)", "Mildly", "4%"],
        ["Sweet orange", "No", "No special limit"],
        ["Any steam-distilled citrus", "No", "No special limit"],
      ]],
      ["p", "Two patterns are worth noticing. First, steam-distilled citrus oils are not phototoxic — distillation leaves the furocoumarins behind. Second, sweet orange is the exception among cold-pressed oils, which is part of why it is the one we recommend most freely."],

      ["h2", "How to use them anyway"],
      ["p", "None of this means avoiding citrus oils. It means being deliberate about where they go."],
      ["ul", [
        "Diffusing is unaffected. Phototoxicity is a skin-and-sunlight reaction; it has nothing to do with scenting a room.",
        "Use them on skin in the evening, or on skin that stays covered.",
        "Wash the area before going out if you have applied something citrus-heavy.",
        "Rinse-off products are far lower risk than leave-on ones, because the contact time is short.",
        "Look for FCF or bergapten-free bergamot if you specifically want a daytime skin blend — the reactive compounds have been removed.",
      ]],
      ["note", "Twelve hours is the rough window. If skin will see direct sun within half a day of application, treat the limits above as firm."],

      ["h2", "Why we sell the unrectified oil"],
      ["p", "We could stock FCF bergamot and never mention any of this. We stock the full cold-pressed oil instead, because stripping the bergapten also strips some of what makes bergamot worth having — and because we would rather tell you how to use something properly than quietly sell you a lesser version of it."],
      ["p", "Every oil on this site that carries a phototoxicity risk says so on its own page, with its specific limit. It is the kind of thing that belongs next to the Add to cart button, not buried in a terms page."],
    ],
  },

  {
    draft: true,
    slug: "how-to-read-an-essential-oil-label",
    title: "How to read an essential oil label",
    excerpt:
      "Two bottles both say lavender. One costs three times the other. The label usually tells you why — if you know which four things to look at.",
    date: "2026-09-28",
    category: "Buying well",
    related: ["lavender-fields", "rosemary", "cinnamon-leaf"],
    body: [
      ["p", "The common name on the front of a bottle is the least informative thing about it. \"Lavender\", \"cedarwood\", \"chamomile\" and \"eucalyptus\" each cover several unrelated plants with different scents, different safety profiles and wildly different prices."],
      ["p", "Everything useful is in the small print. Here is what to look for, roughly in order of how much it tells you."],

      ["h2", "1. The botanical name"],
      ["p", "This is the single most useful thing on a label, because it is the only part that identifies the plant unambiguously."],
      ["ul", [
        "<strong>Lavender</strong> — Lavandula angustifolia is true lavender. Lavandula x intermedia is lavandin, a higher-yield hybrid, much cheaper and sharper, used widely in soaps and detergents.",
        "<strong>Chamomile</strong> — Chamaemelum nobile is Roman, pale and apple-sweet. Matricaria recutita is German, deep blue and herbaceous. Not interchangeable.",
        "<strong>Cedarwood</strong> — Cedrus atlantica is a true cedar. Juniperus virginiana is a juniper. They smell quite different and the second is far cheaper.",
        "<strong>Sandalwood</strong> — Santalum album is Indian sandalwood. Santalum spicatum is Australian. Amyris balsamifera is not sandalwood at all, though it is often sold as one.",
      ]],

      ["h2", "2. The part of the plant"],
      ["p", "Where a difference exists, it usually matters a great deal."],
      ["p", "Cinnamon bark oil and cinnamon leaf oil come from the same tree and behave entirely differently — the bark is a severe skin sensitiser, the leaf is manageable. Clove bud is sweeter and rounder than clove leaf or stem. Bitter orange yields three distinct oils depending on whether you press the peel, distil the flowers or distil the leaves."],
      ["p", "A label that says only \"cinnamon oil\" is leaving out the part that determines whether you can safely put it on skin."],

      ["h2", "3. The extraction method"],
      ["ul", [
        "<strong>Steam distilled</strong> — the standard for most essential oils. Heat and steam carry the volatile compounds across.",
        "<strong>Cold pressed</strong> — used for citrus peel. Keeps the bright top notes, but also keeps the furocoumarins that make some citrus oils phototoxic.",
        "<strong>CO2 extracted</strong> — pressurised carbon dioxide as a solvent. Closer to the smell of the raw plant, usually more expensive.",
        "<strong>Solvent extracted</strong> — produces absolutes, as with jasmine and rose. Not technically essential oils, and some solvent residue is inherent to the process.",
      ]],

      ["h2", "4. The chemotype, where it exists"],
      ["p", "Some species produce meaningfully different oils depending on where and how they grew. Rosemary is the one most people meet: the 1,8-cineole type is the one used in hair and scalp routines, while camphor and verbenone types smell and behave differently."],
      ["p", "Thyme, basil and eucalyptus all have chemotypes too. If a label specifies one, that is a sign the supplier knows what they are selling."],

      ["h2", "What you can ignore"],
      ["p", "Grading phrases — therapeutic grade, clinical grade, aromatherapy grade — are not awarded by anyone and cannot be verified. The same goes for \"100% pure\" on its own: it is a claim every brand makes, including those whose oils are not."],
      ["note", "A label that gives you species, plant part, extraction method and origin is making four checkable statements. A label that gives you a grading phrase is making one that cannot be checked at all."],

      ["h2", "A reasonable rule"],
      ["p", "Buy from people who will answer a specific question with a specific answer. If you ask where an oil came from and get a region, a method and a species, that is a supply chain someone is actually keeping track of. If you get a paragraph about purity and quality commitment, you have learned nothing."],
    ],
  },
];

/** Roughly 200 words a minute, rounded up, minimum one. */
export function readingTime(post) {
  const words = post.body.reduce((n, [kind, value]) => {
    if (kind === "ul" || kind === "ol") return n + value.join(" ").split(/\s+/).length;
    if (kind === "table") return n + value.flat().join(" ").split(/\s+/).length;
    return n + String(value).split(/\s+/).length;
  }, 0);
  return Math.max(1, Math.round(words / 200));
}

export const published = () => posts.filter((p) => !p.draft);

export const postsNewestFirst = () =>
  published().sort((a, b) => b.date.localeCompare(a.date));

export const postBySlug = (slug) => posts.find((p) => p.slug === slug);
