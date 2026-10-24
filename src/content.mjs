/**
 * Per-oil editorial content for the product pages: who each oil suits, what
 * people get wrong with it, what it honestly cannot do, and questions specific
 * to that oil.
 *
 * Products with no entry here still render — the build derives a set of shared
 * questions from the product's own data (see sharedFaqs in build.mjs), and the
 * optional sections are simply left out.
 *
 * Nothing here makes a medical claim. India's Drugs and Magic Remedies
 * (Objectionable Advertisements) Act 1954 prohibits advertising that claims to
 * treat or cure listed conditions, and ASCI polices unsubstantiated health
 * claims. Describe the scent and how people use it; never what it cures.
 */

export const guides = {
  "lavender-fields": {
    whoFor: [
      { h: "A first essential oil", p: "If you are buying one bottle to find out whether any of this is for you, buy this one. Almost every blend starts here." },
      { h: "Anyone building an evening routine", p: "Mild enough to use nightly without the scent becoming tiring, which is not true of most florals." },
      { h: "People who think they dislike lavender", p: "The medicinal smell most people associate with lavender comes from cheaper lavandin. True angustifolia is softer and sweeter." },
    ],
    mistakes: [
      "Using far too much. Lavender is gentle enough that people keep adding drops expecting more effect, when four to six in a diffuser is already the ceiling for most rooms. Past that the scent flattens and turns soapy rather than getting stronger.",
      "Buying on the word alone. Lavandin, spike lavender and true lavender are three different plants sold under one word, at three very different prices. If a bottle does not print the botanical name, there is usually a reason.",
    ],
    limits: [
      "This is a scent, not a sedative. It may help you settle into a routine your body already recognises as bedtime, but it will not override caffeine, a late screen or a genuine sleep disorder.",
    ],
    faqs: [
      { q: "What is the difference between lavender and lavandin?", a: "Lavandin is a hybrid, grown for yield and used widely in detergents and soaps. It is higher in camphor, which gives it the sharper, more medicinal smell. Ours is Lavandula angustifolia, the true lavender, which is softer and sweeter and costs considerably more to produce." },
      { q: "Can I put lavender directly on my skin?", a: "Lavender is one of the gentler oils, but we still recommend diluting it to about 2% — roughly two drops in a teaspoon of carrier — and patch-testing first. Neat application is how most people develop a sensitivity over time." },
      { q: "Will it help me sleep?", a: "We cannot make that claim, and we would not. What we can say is that it is the oil most people reach for in the hour before bed, and that scent is good at signalling to you that the day is ending." },
    ],
  },

  "roman-chamomile": {
    whoFor: [
      { h: "People with reactive skin", p: "One of the mildest oils in the range, which is why it turns up so often in formulations for sensitive skin." },
      { h: "Anyone who finds lavender too floral", p: "Softer and fruitier, with none of the powdery quality that puts some people off lavender entirely." },
      { h: "Blenders working at low dilutions", p: "So concentrated that a single drop carries through a whole blend, which makes an expensive bottle last a surprisingly long time." },
    ],
    mistakes: [
      "Confusing it with German chamomile. German is deep blue, higher in chamazulene and used quite differently. Roman is pale and apple-sweet. They are not interchangeable, and the blue one is not simply a stronger version.",
      "Treating it like a cheap oil because chamomile sounds like a cupboard staple. It takes an enormous volume of flowers to fill a 10 ml bottle, which is why it is priced where it is. Use it a drop at a time.",
    ],
    limits: [
      "It smells almost nothing like chamomile tea, and people expecting that are usually disappointed. The tea is mostly German chamomile, brewed; this is the distilled oil of a different species.",
    ],
    faqs: [
      { q: "Why is this so much more expensive than the other oils?", a: "Yield. It takes roughly two hundred kilograms of flowers to produce a single kilogram of oil, and the flowers have to be picked at the right point. That ratio is the whole explanation for the price." },
      { q: "Is this the same as German or blue chamomile?", a: "No. German chamomile (Matricaria recutita) is a different species, deep blue from its chamazulene content, with a heavier, more herbaceous smell. Roman chamomile is pale yellow and sweet. We stock Roman." },
      { q: "Can I use it on a child?", a: "Roman chamomile is among the milder oils, but we are not in a position to advise on children without knowing the age and circumstances. Ask a doctor or a qualified aromatherapist first." },
    ],
  },

  "cedarwood-grounding": {
    whoFor: [
      { h: "People who dislike sweet scents", p: "Dry and woody with very little sweetness, which makes it a rare option if florals and citrus are not for you." },
      { h: "Anyone building a base note", p: "Sits underneath brighter oils and holds them in place, so a citrus blend lasts longer than citrus alone." },
      { h: "Larger rooms", p: "Diffuses slowly and evenly, where sharper oils can fill a small room and then vanish." },
    ],
    mistakes: [
      "Expecting a pencil-shaving smell. That is Virginian cedarwood, a different tree entirely. Atlas cedar is softer, sweeter and more resinous, and the two are not substitutes for one another despite sharing a name.",
      "Using it as a top note. It is slow and heavy, so adding it last to a blend tends to flatten everything above it. Build it in first and layer the brighter oils over the top.",
    ],
    limits: [
      "There are at least four unrelated trees sold as cedarwood — Atlas, Virginian, Texan and Chinese. If you have used cedarwood before and expect this to smell the same, check which one it was.",
    ],
    faqs: [
      { q: "Is this the same cedarwood used in wardrobes?", a: "Usually not. The timber in moth-repellent blocks is typically Virginian cedar, which is actually a juniper. Ours is Cedrus atlantica, a true cedar from the Atlas mountains, with a softer and sweeter smell." },
      { q: "Why does it smell different from the last cedarwood I bought?", a: "Almost certainly a different species. Atlas, Virginian, Texan and Chinese cedarwood are all sold under the same common name and smell noticeably different. The botanical name on the label is the only reliable guide." },
      { q: "Does it work in a blend with citrus?", a: "Well, and it is one of the more useful things you can do with it. Cedarwood slows down how quickly citrus disappears, so an orange or grapefruit blend holds together for considerably longer." },
    ],
  },

  "sweet-orange-sunrise": {
    whoFor: [
      { h: "Households with children or guests", p: "The least divisive scent we sell. Almost nobody actively dislikes sweet orange, which is not true of most oils." },
      { h: "First-time diffuser owners", p: "Inexpensive enough to use generously while you work out how many drops your room actually needs." },
      { h: "Blending beginners", p: "Forgiving. It sits comfortably under almost anything else, so a blend involving orange is hard to get badly wrong." },
    ],
    mistakes: [
      "Storing it for years. Cold-pressed citrus oils oxidise far faster than distilled oils — expect about a year from opening, not three. An orange oil that has turned smells sharp and faintly of cardboard.",
      "Over-diffusing it. Because it is cheap and pleasant, people pour it in. Five drops scents a room; fifteen makes it cloying and wastes the bottle.",
    ],
    limits: [
      "It is a short-lived top note. In a blend it is the first thing you smell and the first thing to disappear, usually within the hour, which is why it is normally paired with something slower underneath.",
    ],
    faqs: [
      { q: "How long does it keep?", a: "About a year from opening, which is shorter than most of our range. Cold-pressed citrus oils oxidise quickly. Keep the cap tight, store it somewhere cool and dark, and buy the smaller bottle if you diffuse occasionally." },
      { q: "Is sweet orange phototoxic like bergamot?", a: "No. Sweet orange is one of the few cold-pressed citrus oils that is not meaningfully phototoxic, so it is safe to use in a diluted skin blend during the day. Bitter orange, bergamot, lemon and grapefruit are different." },
      { q: "What does it blend well with?", a: "Nearly everything. Cinnamon and clove for winter, cedarwood or frankincense for something warmer and longer-lasting, peppermint for a sharper morning blend." },
    ],
  },

  "peppermint-spark": {
    whoFor: [
      { h: "Afternoon desk work", p: "The most reliably rousing oil in the range, and the one most people reach for at the point the day stalls." },
      { h: "Anyone who finds citrus too sweet", p: "Cold and clean rather than sugary, with a menthol bite that citrus does not have." },
      { h: "Sports and tired legs", p: "Widely used in post-exercise massage blends at low dilution for the cooling sensation." },
    ],
    mistakes: [
      "Putting it anywhere near the eyes. Menthol vapour travels, so even a drop rubbed on the temples with unwashed hands is a genuinely unpleasant mistake. Dilute it, keep it below the brow line, and wash your hands after.",
      "Using it last thing at night. It is a stimulant scent for most people, and diffusing it in a bedroom is a common reason someone decides essential oils 'do not work' for sleep.",
    ],
    limits: [
      "Not suitable around babies and young children — menthol and the related compounds can affect breathing in the very young. Keep it out of nurseries and away from pets, cats in particular.",
    ],
    faqs: [
      { q: "Can I use peppermint on my skin?", a: "Diluted, and not on broken or sensitive skin. Two per cent in a carrier oil is plenty, and the cooling sensation is strong enough that more is genuinely uncomfortable rather than more effective." },
      { q: "Is it safe around children and pets?", a: "We would avoid it. Menthol can affect breathing in babies and young children, and cats in particular metabolise these compounds poorly. If you have either in the house, diffuse something else." },
      { q: "Is this the same as mint oil or cornmint?", a: "No. Cornmint (Mentha arvensis) is cheaper, much higher in menthol and often sold as peppermint. Ours is Mentha piperita, which is rounder and sweeter rather than purely cold." },
    ],
  },

  "lemon-clarity": {
    whoFor: [
      { h: "Kitchens and workspaces", p: "Cuts through cooking smells and stale air faster than any other oil we carry." },
      { h: "Homemade cleaning blends", p: "A few drops in a vinegar spray makes the vinegar bearable, which is usually the obstacle." },
      { h: "Focus blends", p: "Pairs with rosemary and peppermint for the standard study blend, and carries the other two." },
    ],
    mistakes: [
      "Using it on skin before going outside. Cold-pressed lemon is phototoxic — the reaction is with sunlight, not with the oil alone, and it can leave lasting marks. Keep it off exposed skin during daylight.",
      "Keeping it too long. Like all citrus peel oils it has about a year in it. An old lemon oil smells flat and slightly waxy, and oxidised citrus is more likely to irritate skin than fresh.",
    ],
    limits: [
      "It will not mask a smell at source. Lemon oil moves air around pleasantly, but a diffuser is not a substitute for finding the thing in the kitchen that is actually causing the problem.",
    ],
    faqs: [
      { q: "Can I add lemon oil to water and drink it?", a: "No. We do not sell any of our oils for internal use, regardless of what you may have read. Essential oils are extremely concentrated and are not food ingredients." },
      { q: "Why is it phototoxic when the fruit is not?", a: "The oil concentrates compounds from the peel that react with UV light. The whole fruit contains them in far smaller amounts. This is why cold-pressed citrus oils need care on skin and steam-distilled ones do not." },
      { q: "Can I use it to clean?", a: "Yes, and it is one of the better uses for it. Four or five drops in a vinegar-based surface spray works well. Keep it off untreated stone, which does not react well to either citrus or vinegar." },
    ],
  },

  "eucalyptus-clearing": {
    whoFor: [
      { h: "The change of season", p: "The oil most people buy once a year, when the weather turns and the house starts to feel closed up." },
      { h: "Steam inhalation", p: "The classic use: a few drops in a bowl of hot water, a towel over the head, and a few minutes of breathing." },
      { h: "Post-exercise rubs", p: "Common in chest and muscle blends at low dilution for the cooling, opening quality." },
    ],
    mistakes: [
      "Using too much in a steam bowl. Three drops is the right number. People use ten, find it overwhelming to the point of stinging, and conclude the oil is too strong rather than the dose.",
      "Diffusing it around young children. Like peppermint, the 1,8-cineole that makes eucalyptus useful is the same compound that makes it unsuitable for babies and toddlers.",
    ],
    limits: [
      "It is not a treatment for anything. It smells clearing and many people find steam comforting when they are congested, but the steam is doing most of that work and neither will shorten an illness.",
    ],
    faqs: [
      { q: "Which eucalyptus is this?", a: "Eucalyptus globulus, the blue gum, which is the high-cineole type most people mean by eucalyptus. Eucalyptus radiata is gentler and E. citriodora smells of lemon — all three are sold simply as 'eucalyptus'." },
      { q: "Can I use it in the shower?", a: "Yes. A few drops on the shower floor, away from where the water lands directly, will evaporate in the steam. Do not apply it to your skin in the shower, where hot water increases absorption." },
      { q: "Is it safe around children?", a: "Not for babies and young children. Cineole-rich oils can affect breathing in the very young. For a household with small children, ask a doctor before diffusing it at all." },
    ],
  },

  "tea-tree-shield": {
    whoFor: [
      { h: "Skincare routines", p: "The reason most people buy tea tree, and it is usually bought for a specific blemish rather than general use." },
      { h: "Homemade cleaning products", p: "Earns its place in a surface spray, where the medicinal smell is an asset rather than a drawback." },
      { h: "Anyone who wants one practical oil", p: "If you want a single bottle that does something useful rather than smelling nice, this is it." },
    ],
    mistakes: [
      "Applying it neat to a spot. This is by far the most common tea tree mistake and the fastest route to a sensitivity you then have for life. Dilute to one per cent, even for targeted use.",
      "Using an old bottle on skin. Oxidised tea tree is substantially more likely to cause a reaction than fresh. If it has been open more than a year, keep it for cleaning and buy a new one for skin.",
    ],
    limits: [
      "It is not a medicine and we make no claims about what it treats. It is also one of the more frequent causes of contact allergy among essential oils, which is worth knowing before you use it daily.",
    ],
    faqs: [
      { q: "Can I dab it straight onto a spot?", a: "We would strongly advise against it, even though it is the most commonly given advice online. Neat application is the main way people become sensitised to tea tree. One per cent in jojoba, applied with a cotton bud, is the safer route." },
      { q: "Does it go off?", a: "It oxidises, and oxidised tea tree is noticeably more irritating than fresh. Keep the cap tight, store it cool and dark, and retire it from skin use after about a year." },
      { q: "Is it safe for pets?", a: "No. Tea tree is genuinely toxic to cats and dogs, including as vapour in an enclosed room. If you have pets, do not diffuse it and keep the bottle somewhere they cannot reach." },
    ],
  },

  "ginger-warmth": {
    whoFor: [
      { h: "Cold mornings", p: "Warming in a way that citrus and mint are not, and it carries well in a cold room." },
      { h: "Massage blends", p: "Widely used at low dilution in warming body oils, particularly over winter." },
      { h: "Spice blenders", p: "Rounder and brighter than clove or cinnamon, so it warms a blend without dominating it." },
    ],
    mistakes: [
      "Expecting the smell of ground ginger. The powdered spice is dried; this is distilled from fresh root, which keeps a bright, almost lemony top note that the dried spice has lost entirely.",
      "Using it at the same dilution as a citrus oil. It is warming on skin and a one-and-a-half per cent blend is plenty. More is not cosier, it is uncomfortable.",
    ],
    limits: [
      "Distilled ginger oil contains none of the gingerols that give fresh ginger its heat on the tongue — those are not volatile. It smells like ginger; it does not behave like eating it.",
    ],
    faqs: [
      { q: "Why does it smell lighter than ginger powder?", a: "Because it is distilled from fresh rhizome rather than dried. Drying destroys the bright citrus-like top notes, which is why ground ginger smells dustier and flatter than the fresh root." },
      { q: "Can I use it in cooking?", a: "No. None of our oils are food grade and none are sold for internal use. Use fresh or ground ginger in the kitchen." },
      { q: "What does it blend with?", a: "Sweet orange for a straightforward winter blend, eucalyptus for something sharper, and frankincense if you want the warmth without the sweetness." },
    ],
  },

  "rosehip-renewal": {
    whoFor: [
      { h: "Dry or mature skin", p: "Absorbs quickly and leaves very little residue, which is unusual for an oil this rich." },
      { h: "Anyone diluting essential oils for the face", p: "A carrier that is doing something in its own right rather than simply providing volume." },
      { h: "Night routines", p: "Best as the last step on damp skin, where it has hours to work and no makeup to sit under." },
    ],
    mistakes: [
      "Storing it in a warm bathroom. Unrefined rosehip is high in unsaturated fats and turns faster than almost any other carrier. It belongs in the fridge once opened, and it will smell unmistakably off when it goes.",
      "Using too much. Three or four drops covers a face. People use a pipette-full, find it greasy, and conclude the oil is too heavy when the dose was the problem.",
    ],
    limits: [
      "This is a carrier oil, not an essential oil — it is pressed from seed rather than distilled, and it has no aroma to speak of. If you are looking for scent, this is not the bottle.",
      "It is also not a replacement for sunscreen, a moisturiser with humectants, or anything prescribed to you.",
    ],
    faqs: [
      { q: "Does it need to go in the fridge?", a: "Once opened, ideally yes. Unrefined rosehip is high in unsaturated fats and oxidises quickly at room temperature, especially in a warm bathroom. Refrigerated, it will comfortably last the season." },
      { q: "Why is it orange, and will it stain?", a: "The colour comes from carotenoids in the unrefined seed oil. At the few drops you should be using it will not stain skin, but it can mark a light pillowcase if you apply it heavily right before bed." },
      { q: "Can I use it with my other products?", a: "Yes, as the last step. Oils seal in what is underneath, so apply water-based serums first and rosehip afterwards, onto damp skin." },
    ],
  },

  "frankincense-quiet": {
    whoFor: [
      { h: "Meditation and breathwork", p: "The oil with the longest history of exactly this use, and still the most common reason people buy it." },
      { h: "Facial oil blends", p: "Long used in skincare formulations, usually at one or two per cent in a carrier." },
      { h: "People who want one special bottle", p: "If the rest of the range is everyday, this is the one most people treat as an occasion." },
    ],
    mistakes: [
      "Expecting church incense. That smell is frankincense resin burned on charcoal, which is a combustion product. The distilled oil is lighter, drier and faintly citrus, and people are often surprised by how different it is.",
      "Buying the cheapest available. Frankincense is among the most commonly adulterated oils on the market, usually cut with cheaper resins or solvent residue. A low price is the most reliable warning sign there is.",
    ],
    limits: [
      "There are several Boswellia species sold as frankincense — carterii, serrata, sacra, frereana — with genuinely different scents and prices. Ours is carterii. None of them are interchangeable.",
      "Boswellia trees in parts of the range are under pressure from over-tapping. We buy small quantities and we would rather sell you less of it than more.",
    ],
    faqs: [
      { q: "Why does it not smell like incense?", a: "Because incense is resin burning. Combustion creates smoky compounds that distillation does not. The oil is the lighter, drier, slightly citrus part of that smell, without the smoke." },
      { q: "Which Boswellia species is this?", a: "Boswellia carterii. Serrata is the Indian species and smells sharper and more turpentine-like; sacra is closely related to carterii and often sold at a premium. The botanical name is the only way to tell them apart." },
      { q: "Is it sustainable?", a: "Honestly, it is a concern across the industry. Over-tapping has damaged tree populations in parts of the growing range. We buy in small quantities from suppliers who can tell us where the resin came from, and we would rather be candid about this than claim certainty we do not have." },
    ],
  },

  "geranium-balance": {
    whoFor: [
      { h: "Anyone who wants rose without the price", p: "Shares several aroma compounds with rose at a small fraction of the cost." },
      { h: "Combination skin", p: "The most common reason it is bought, usually at one per cent in a facial oil." },
      { h: "Floral blends", p: "Sits between lavender and the heavier florals and makes both easier to work with." },
    ],
    mistakes: [
      "Expecting it to be rose. It is rose-adjacent, not rose — greener, sharper, with a minty edge that true rose does not have. People who buy it as a rose substitute are usually disappointed; people who buy it as geranium are not.",
      "Using it heavily. It is more tenacious than it first appears, and a blend that smells balanced in the bottle can be overwhelming an hour later on skin.",
    ],
    limits: [
      "Rose geranium and geranium bourbon are sold almost interchangeably and smell meaningfully different. If you have bought geranium before and liked it, check which one it was.",
    ],
    faqs: [
      { q: "Is this the same as rose geranium?", a: "They are closely related and often conflated. Rose geranium is a particular cultivar selected for its rose-like character. Both come from Pelargonium graveolens and the names are used loosely across the industry." },
      { q: "Can I use it instead of rose oil?", a: "In a blend, often yes, and it is a sensible way to get a floral note without the cost of true rose. On its own it reads as geranium rather than rose — greener, with a mint edge." },
      { q: "Is it safe during pregnancy?", a: "Geranium is one of the oils commonly advised against in the first trimester. Ask a doctor or a qualified aromatherapist who knows your circumstances before using it." },
    ],
  },

  "ylang-ylang": {
    whoFor: [
      { h: "People who like heavy florals", p: "Among the most intensely floral oils there is. If jasmine and tuberose appeal, this will." },
      { h: "Blenders rounding off citrus", p: "A single drop takes the sharp edge off an orange or bergamot blend without reading as floral." },
      { h: "Anyone curious about perfumery", p: "A textbook example of how fractional distillation changes an oil, and a good one to learn on." },
    ],
    mistakes: [
      "Using it at the same rate as everything else. Two drops is a diffuser's worth. At five it stops smelling like flowers and starts smelling like a headache, and that reputation is almost entirely a dosing problem.",
      "Buying on price without checking the grade. Extra, I, II and III are fractions drawn off the same still at different points. III is far cheaper and noticeably flatter, and the grade is often left off the label.",
    ],
    limits: [
      "It is genuinely polarising. A meaningful number of people find ylang ylang cloying at any dose, and there is no dilution that fixes that — it is a preference, not a technique.",
    ],
    faqs: [
      { q: "What does 'Extra' mean?", a: "It is the first fraction drawn off the still, taken in the first hour or so of distillation, when the lightest and most delicate compounds come across. Later fractions — I, II and III — are cheaper and progressively flatter." },
      { q: "Why do some people dislike it?", a: "It is very rich and very sweet, and at anything above a couple of drops it becomes overwhelming for many people. Try it at one drop in a blend before committing to diffusing it alone." },
      { q: "Does it blend well with anything?", a: "Citrus, particularly bergamot and sweet orange, where it adds body without taking over. Also sandalwood, if you want something warm and heavy." },
    ],
  },

  "vetiver-khus": {
    whoFor: [
      { h: "Anyone who finds most oils too bright", p: "About as low and dark as aromatics get. Nothing else in the range sits this far down." },
      { h: "Perfume blenders", p: "A classic base note that anchors a blend and keeps lighter oils from disappearing within the hour." },
      { h: "People who grew up with khus", p: "The smell of khus-khus screens and summer water coolers, in concentrated form." },
    ],
    mistakes: [
      "Treating it like the other oils in a diffuser. Vetiver is thick, slow and extremely tenacious. Two drops is plenty and the smell will still be in the room tomorrow.",
      "Judging it from the bottle. Neat vetiver can smell harsh and almost sour. It needs dilution and a little air before the earthy, rooty quality people actually want comes forward.",
    ],
    limits: [
      "It is viscous enough that it does not drop cleanly from a standard dropper, particularly in a cool room. Warming the bottle in your hands for a minute helps.",
    ],
    faqs: [
      { q: "Why is it so thick?", a: "Vetiver is a heavy, high-viscosity oil by nature. In cooler weather it can be slow enough that the dropper seems blocked. Warm the bottle between your palms before using it." },
      { q: "Is khus the same as vetiver?", a: "Yes. Khus is the Indian name for the same grass, Vetiveria zizanioides, and khus-khus screens and coolers are made from its roots. The oil is distilled from those same roots." },
      { q: "How long does the smell last?", a: "A long time, which is the point. Vetiver is one of the most tenacious materials in perfumery and is used specifically to make other things last. Expect it to linger on fabric for days." },
    ],
  },

  "sandalwood-mysore": {
    whoFor: [
      { h: "Meditation practice", p: "The oil with the deepest association with this use in India, and still bought mostly for it." },
      { h: "Dry or reactive skin", p: "Long used in facial oils at low dilution, and one of the gentler materials on skin." },
      { h: "Serious blenders", p: "A base note that holds florals in place better than almost anything else available." },
    ],
    mistakes: [
      "Assuming any oil labelled sandalwood is this species. Australian sandalwood, Amyris and West Indian sandalwood are all sold under the name and are a fraction of the price for good reason. Check for Santalum album.",
      "Using too much. This is the most expensive thing we sell by volume and a single drop carries. Treating it like cedarwood is an expensive habit.",
    ],
    limits: [
      "Santalum album is slow-growing and tightly regulated in India, which constrains how much legally harvested oil exists. We buy small quantities and sell a 5 ml bottle because that is what we can supply honestly.",
      "If you have bought cheap sandalwood before and liked the smell, this may not match it — most inexpensive sandalwood is a different species or a synthetic reconstruction.",
    ],
    faqs: [
      { q: "Why is it this expensive?", a: "Santalum album takes decades to develop usable heartwood, harvesting is tightly regulated in India, and demand far exceeds supply. Any Indian sandalwood oil priced cheaply is almost certainly not Santalum album." },
      { q: "Is it legally and sustainably sourced?", a: "It comes from regulated plantation timber rather than wild harvest, through suppliers who can document it. We buy in small quantities and would rather run out than take a volume we cannot stand behind." },
      { q: "How is this different from Australian sandalwood?", a: "Australian sandalwood is Santalum spicatum, a related but distinct species. It is drier, slightly greener and considerably cheaper. It is a legitimate oil in its own right, but it is not Indian sandalwood." },
    ],
  },

  "lemongrass": {
    whoFor: [
      { h: "Anyone who wants an obvious scent", p: "Fills a room quickly and unmistakably, where subtler oils can go unnoticed." },
      { h: "Kitchens", p: "Handles cooking smells better than most, and the grassy edge keeps it from reading as air freshener." },
      { h: "Outdoor summer evenings", p: "A common component of homemade outdoor blends, usually alongside citronella." },
    ],
    mistakes: [
      "Treating it as gentle because it smells fresh. Lemongrass is one of the more skin-irritating oils in the range and needs a lower dilution than most citrus — one per cent is the sensible ceiling.",
      "Using it in a small room at citrus doses. Four drops that are pleasant in a living room will be overpowering in a bathroom. It is far stronger than its freshness suggests.",
    ],
    limits: [
      "It is not citronella, and it is not a repellent in any form we can make a claim about. The two are related grasses with a similar smell, and the comparison is where most of the confusion comes from.",
    ],
    faqs: [
      { q: "Is lemongrass the same as citronella?", a: "No, though they are related grasses in the same genus and smell similar. Citronella is Cymbopogon nardus or winterianus; lemongrass is C. citratus, which is the one used in cooking." },
      { q: "Can I use it on my skin?", a: "At low dilution only — one per cent or less. Lemongrass is high in citral, which is a known skin irritant, and it is one of the oils most likely to cause a reaction at ordinary dilutions." },
      { q: "Does it keep insects away?", a: "We are not going to claim that. It is a common ingredient in homemade outdoor blends and people like the smell on a summer evening, which is as far as we will go." },
    ],
  },

  "bergamot": {
    whoFor: [
      { h: "Earl Grey drinkers", p: "This is the scent in the tea, and recognising it is usually the moment bergamot clicks for people." },
      { h: "Anyone bored of lemon and orange", p: "Far more complex than either — green and faintly bitter rather than simply sweet." },
      { h: "Evening diffusing", p: "Bright without being stimulating, which makes it one of the more flexible citrus oils." },
    ],
    mistakes: [
      "Putting it on skin before going out. This is the single most important thing to know about bergamot. The reaction needs sunlight, so it can happen hours after application and leave marks that last months.",
      "Assuming all bergamot is phototoxic. FCF or bergapten-free bergamot has had the reactive compounds removed and is safe in daylight. Ours is the cold-pressed, unrectified oil, which is not.",
    ],
    limits: [
      "Like all cold-pressed citrus oils it has roughly a year in it from opening, and oxidised bergamot is both flatter and more likely to irritate skin.",
    ],
    faqs: [
      { q: "What does phototoxic actually mean?", a: "Bergapten in the oil reacts with UV light on skin, which can cause burning and lasting dark patches. It needs both the oil and sunlight, so a blend applied in the evening and washed off is a different proposition from one applied before a walk." },
      { q: "What dilution is safe on skin?", a: "Below 0.4% on any skin that will see daylight within about twelve hours — that is roughly one drop in four teaspoons of carrier. For diffusing, phototoxicity is not a concern at all." },
      { q: "Is this FCF bergamot?", a: "No. FCF has the bergapten stripped out, which makes it daylight-safe but also removes some of the character. We sell the full cold-pressed oil and tell you how to use it." },
    ],
  },

  "grapefruit": {
    whoFor: [
      { h: "Morning routines", p: "Tarter and drier than orange, which makes it read as waking rather than comforting." },
      { h: "People who find orange too sweet", p: "The bitter pith note stops it becoming cloying in a diffuser." },
      { h: "Focus and desk blends", p: "Works well with peppermint and rosemary where orange would be too soft." },
    ],
    mistakes: [
      "Buying the large bottle for occasional use. Grapefruit is among the shortest-lived oils we sell, and a 30 ml bottle used twice a month will turn before it empties.",
      "Forgetting that it is mildly phototoxic. Less so than bergamot, but still enough to matter on skin that is going into direct sun within half a day.",
    ],
    limits: [
      "It fades fast. In a blend grapefruit is the first note to go, often within half an hour, which is why it is usually built over something slower.",
    ],
    faqs: [
      { q: "How is it different from lemon or orange?", a: "Drier and more bitter than either, with a pithy edge. Orange is sweet, lemon is sharp and clean, grapefruit sits between them with a bitterness neither has." },
      { q: "Is it phototoxic?", a: "Mildly. The limit is around 4% on skin that will see sun within twelve hours, which is far more forgiving than bergamot's 0.4%. Diffusing is unaffected." },
      { q: "Why does it fade so quickly?", a: "It is a light top note made of small, volatile molecules that evaporate fast. That is also why it smells so immediate. Pair it with cedarwood or vetiver if you want it to last." },
    ],
  },

  "clove-bud": {
    whoFor: [
      { h: "Winter diffuser blends", p: "One or two drops with orange and cinnamon is the whole of a seasonal blend." },
      { h: "Homemade cleaning products", p: "Earns a place in a surface spray, where the strength is useful rather than a problem." },
      { h: "Experienced users", p: "Not a beginner's oil. It demands attention to dilution in a way most of our range does not." },
    ],
    mistakes: [
      "Applying it to gums or teeth. This is widely repeated advice and it is how people end up with chemical burns and damaged tissue. Clove oil is not a dental treatment and we do not sell it as one.",
      "Using it at normal dilutions. Half a per cent is the ceiling on skin. Most oils tolerate two or three per cent; clove is in a different category entirely because of its eugenol content.",
    ],
    limits: [
      "It is a strong skin sensitiser, and sensitisation is permanent once it happens. If you are not confident about measuring a 0.5% dilution, this oil is not the right place to start.",
      "Avoid it in pregnancy, keep it away from children, and do not diffuse it around pets.",
    ],
    faqs: [
      { q: "Can I use it for toothache?", a: "No, and we will not advise it. Putting clove oil on gums is common folk advice and a common cause of chemical burns to soft tissue. See a dentist." },
      { q: "Why is bud oil better than leaf or stem?", a: "Bud oil is sweeter, rounder and less harsh. Leaf and stem oils are much cheaper, higher in eugenol and noticeably coarser, and they are often what you get when a bottle just says 'clove oil'." },
      { q: "What is the maximum safe dilution?", a: "0.5% on skin — roughly one drop in two teaspoons of carrier. Above that the risk of sensitisation rises sharply, and sensitisation does not go away." },
    ],
  },

  "cinnamon-leaf": {
    whoFor: [
      { h: "Winter blends", p: "Warming and spicy at a dose and a price that make it practical for seasonal diffusing." },
      { h: "Anyone who wanted cinnamon bark", p: "The sensible alternative. Similar character, considerably safer on skin." },
      { h: "Cleaning blends", p: "A drop or two in a floor wash, where the strength is an advantage." },
    ],
    mistakes: [
      "Assuming it behaves like the bark oil. It does not, and that is deliberate on our part — bark oil is a severe sensitiser that we will not sell in a dropper bottle. Leaf is gentler, but it is still a spice oil.",
      "Diffusing it at the same rate as orange. Two drops in a blend is plenty. Cinnamon dominates anything it is put with, and more of it does not make a blend warmer, only narrower.",
    ],
    limits: [
      "It is still a sensitiser, just a less aggressive one than the bark. Keep it to 0.6% on skin and avoid it during pregnancy.",
    ],
    faqs: [
      { q: "Why do you not sell cinnamon bark oil?", a: "Bark oil is very high in cinnamaldehyde, which is a severe skin sensitiser and a serious irritant. It has legitimate industrial uses, but we do not think it belongs in a consumer dropper bottle, so we stock the leaf." },
      { q: "How does leaf oil differ from bark?", a: "Leaf is higher in eugenol and closer to clove in character — warm and spicy but rounder. Bark is sharper and sweeter, more like the smell of the spice itself, and considerably more hazardous on skin." },
      { q: "Can I use it on skin?", a: "At 0.6% or below, and not during pregnancy. For most people the better use is diffusing, where dilution is not a concern." },
    ],
  },

  "rosemary": {
    whoFor: [
      { h: "Hair and scalp routines", p: "By a distance the most common reason this is bought, usually diluted into jojoba for a scalp massage." },
      { h: "Study and desk work", p: "Sharp and green, and it pairs naturally with peppermint for a focus blend." },
      { h: "People who like herbal scents", p: "Closer to the garden than to perfume, which is exactly the appeal for some and not for others." },
    ],
    mistakes: [
      "Using it neat on the scalp. Five drops in a tablespoon of carrier is the right strength. Neat rosemary on skin is both unnecessary and a reliable route to irritation.",
      "Expecting results in a fortnight. Hair routines work on the timescale of hair, which is months. People try it for three weeks, see nothing and stop.",
    ],
    limits: [
      "We are not going to tell you it regrows hair. There is published research people find encouraging, but we sell an essential oil, not a treatment, and claiming otherwise would be both dishonest and unlawful here.",
      "Avoid it in pregnancy, and if you have epilepsy or high blood pressure, ask a doctor before using it at all.",
    ],
    faqs: [
      { q: "Does rosemary oil help hair growth?", a: "We cannot make that claim and we are not going to. There is research people find interesting, and it is overwhelmingly the reason customers buy it, but an essential oil is not a medicine and Indian advertising rules are clear about what we may say." },
      { q: "How do I use it for a scalp massage?", a: "Five drops into a tablespoon of jojoba or sweet almond, massaged into the scalp, left for around thirty minutes and then washed out. Two or three times a week is what most people settle on." },
      { q: "Which chemotype is this?", a: "The 1,8-cineole type, which is the one used in most of the published work and the one usually meant when people ask for rosemary oil. Camphor and verbenone chemotypes smell and behave differently." },
    ],
  },

  "jojoba": {
    whoFor: [
      { h: "Anyone diluting essential oils", p: "The default base. If you are buying one carrier to go with everything else, buy this." },
      { h: "Oily or acne-prone skin", p: "Light, non-greasy and closest of any carrier to the skin's own sebum." },
      { h: "People who have had carriers go rancid", p: "Technically a wax, not a fat, which is why it keeps for years rather than months." },
    ],
    mistakes: [
      "Buying refined over unrefined without realising. Clear, colourless jojoba has been processed; golden jojoba has not. The golden version costs a little more and keeps more of what makes it useful.",
      "Expecting it to moisturise on its own. It seals rather than hydrates. Applied to dry skin it traps nothing; applied to damp skin it works.",
    ],
    limits: [
      "It has no meaningful scent and is not an essential oil. If you were looking for aroma, this is the wrong bottle — its job is to carry the others.",
    ],
    faqs: [
      { q: "Why does jojoba last so much longer than other carriers?", a: "Because it is a liquid wax ester rather than a triglyceride fat. The chemistry that makes seed oils go rancid does not really apply, which is why jojoba keeps for years where rosehip keeps for months." },
      { q: "How much essential oil do I add?", a: "For a 2% dilution, about 12 drops per 30 ml of jojoba. For the face, 1% — around 6 drops per 30 ml — is a more sensible starting point." },
      { q: "Will it clog pores?", a: "Jojoba is generally considered low on that scale and is widely used in products for oily skin, but skin varies. Patch-test on a small area for a few days before using it on your whole face." },
    ],
  },

  "sweet-almond": {
    whoFor: [
      { h: "Full-body massage", p: "Inexpensive enough to use generously, which is where jojoba becomes extravagant." },
      { h: "Dry skin", p: "Richer and slower to absorb than jojoba, which is a drawback on the face and an advantage on the body." },
      { h: "Anyone starting out", p: "The most forgiving and cheapest way to learn how dilution actually works." },
    ],
    mistakes: [
      "Buying a large bottle and keeping it for years. It is a seed oil and it will turn — expect about a year, less in a warm bathroom. Rancid carrier oil smells like old crayons and should not go on skin.",
      "Using it on the face and deciding oils break you out. It is heavier than jojoba and slower to absorb. For facial use, jojoba or rosehip is usually the better choice.",
    ],
    limits: [
      "It is a tree nut oil. If there is a nut allergy in the household, do not buy it — use jojoba, which is not a nut.",
      "Like all our carriers it has no aroma of consequence. This is a base, not a scent.",
    ],
    faqs: [
      { q: "Is this safe if I have a nut allergy?", a: "No. Sweet almond oil is pressed from tree nuts and should be avoided entirely if you have a nut allergy. Jojoba is the straightforward alternative — it comes from a shrub seed, not a nut." },
      { q: "How is it different from jojoba?", a: "Heavier, slower to absorb, cheaper, and it has a shorter shelf life because it is a true fat rather than a wax. Better for body massage; jojoba is better for the face." },
      { q: "Is it the same as bitter almond oil?", a: "No, and the distinction matters. Bitter almond essential oil is a different product entirely and is not something we sell. This is the cold-pressed fixed oil from sweet almonds, used as a carrier." },
    ],
  },

  "basil-holy": {
    whoFor: [
      { h: "Seasonal steam inhalation", p: "A few drops in hot water, usually alongside eucalyptus, when the weather turns." },
      { h: "Anyone who grew up around tulsi", p: "The familiar peppery sweetness of the plant, concentrated." },
      { h: "Spice-forward blenders", p: "Sits between herbal and spicy, and bridges the two in a way few oils manage." },
    ],
    mistakes: [
      "Assuming it is culinary basil. Holy basil is a different species from the sweet basil used in cooking — more peppery, more clove-like, and they are not substitutes in a blend.",
      "Using it in pregnancy. Holy basil is among the oils routinely advised against, and it is widely assumed to be gentle because the plant is so familiar in Indian homes.",
    ],
    limits: [
      "Tulsi carries real cultural and religious significance in India, and we are conscious of selling it as a commodity. We stock the distilled leaf oil; we make no claims beyond how it smells and how people use it.",
    ],
    faqs: [
      { q: "Is holy basil the same as the basil in cooking?", a: "No. Culinary sweet basil is Ocimum basilicum. Holy basil, or tulsi, is Ocimum sanctum — more peppery, with a clove-like warmth that sweet basil does not have." },
      { q: "Can I use it in cooking?", a: "No. None of our oils are food grade or sold for internal use. Use fresh tulsi leaves if you want the flavour." },
      { q: "Is it safe in pregnancy?", a: "It is one of the oils commonly advised against during pregnancy. Speak to a doctor before using it, and err towards leaving it out." },
    ],
  },
};
