/**
 * Editorial content for the collection hub pages.
 *
 * A collection page is where commercial search lands — "essential oils for
 * sleep" is a far bigger query than any single product name — so these pages
 * carry real content rather than just a grid.
 *
 * Keyed by category id. Everything else on those pages (the comparison table,
 * the family groupings, the price range) is derived from the product data.
 *
 * Same rule as everywhere else: describe how oils smell and how people use
 * them, never what they treat.
 */

export const hubs = {
  relaxation: {
    lede:
      "These are the oils people reach for once the day is over. Soft florals, dry woods and herbs that read as quiet rather than fresh — the opposite end of the range from the citrus and mints.",
    startHere: {
      id: "lavender-fields",
      why: "If you are buying your first oil in this collection, buy lavender. It is the one almost every evening blend is built on, it is mild enough to use nightly, and it will tell you quickly whether any of this is for you.",
    },
    choosing: [
      { h: "Florals are the obvious entry", p: "Lavender, ylang ylang and the absolutes are what most people picture. They are also the most polarising — ylang ylang and tuberose divide opinion sharply, so start small." },
      { h: "Woods last longest in a room", p: "Cedarwood, vetiver, sandalwood and patchouli sit low and slow. They hold a blend together and are still noticeable hours after a floral has gone." },
      { h: "Herbaceous oils suit people who dislike sweetness", p: "Roman chamomile, clary sage and marjoram are soft without being sugary, which makes them easier to live with night after night." },
    ],
    uses: [
      { h: "Diffuse before bed", p: "Four to six drops an hour before sleep. More does not work better — it flattens the scent." },
      { h: "Dilute for a body oil", p: "Two per cent in jojoba — roughly 12 drops per 30 ml — massaged into wrists or the soles of the feet." },
      { h: "Build a blend", p: "A wood underneath, a floral on top. One drop of an absolute is enough to change the whole thing." },
    ],
    faqs: [
      { q: "Which oil is best for sleep?", a: "We cannot make that claim, and nobody honestly can. What we can say is that lavender is overwhelmingly the one people buy for their evening routine, followed by cedarwood and the Deep Sleep style blends. Scent is good at signalling to you that the day is ending; it is not a sedative." },
      { q: "What is the difference between an essential oil and an absolute?", a: "Extraction. Essential oils are distilled; absolutes are extracted with solvents, because flowers like jasmine, rose and tuberose are destroyed by the heat of distillation. Absolutes carry trace solvent residue by nature of the process, which is worth knowing before you buy one." },
      { q: "Can I diffuse these overnight?", a: "We would not. Run a diffuser for 30 to 60 minutes and let it stop. Olfactory fatigue means you stop registering the smell within minutes anyway, so an all-night session mostly wastes oil." },
      { q: "Which of these are safe in pregnancy?", a: "Several in this collection are commonly advised against — clary sage, marjoram, davana and the absolutes among them. Each product page states its own position, but speak to a doctor rather than relying on a website." },
    ],
  },

  energy: {
    lede:
      "Citrus peel, cold mint and cut grass. These are the oils that cut through a stuffy room and a sluggish afternoon, and they are the easiest place to start if you have never used essential oils before.",
    startHere: {
      id: "sweet-orange-sunrise",
      why: "The least divisive oil we sell. Almost nobody dislikes sweet orange, it is inexpensive enough to use generously while you work out how many drops your room needs, and unusually for a cold-pressed citrus it is not phototoxic.",
    },
    choosing: [
      { h: "Citrus is bright but short-lived", p: "Orange, lemon, bergamot and grapefruit are the first thing you smell and the first to disappear — often within the hour. Pair them with a wood if you want them to last." },
      { h: "Mind the sunlight with most citrus", p: "Cold-pressed bergamot, lime, lemon and grapefruit are phototoxic to varying degrees. Sweet orange and mandarin are the exceptions, which is why we recommend those for daytime skin blends." },
      { h: "Mints are stronger than they smell", p: "Peppermint is cold and immediate; spearmint is sweeter with far less menthol. Neither belongs in a bedroom, and neither is suitable around babies." },
    ],
    uses: [
      { h: "Diffuse through the morning", p: "Four to six drops. Citrus suits a room people are moving through rather than sitting still in." },
      { h: "Add to cleaning", p: "Four or five drops in a vinegar-based surface spray. Lemon and lime earn their place here." },
      { h: "Blend for focus", p: "Rosemary, peppermint and lemon is the standard desk blend, and it works." },
    ],
    faqs: [
      { q: "Why do citrus oils go off so quickly?", a: "They are cold-pressed rather than distilled, which keeps the bright top notes but also the compounds that oxidise. Expect about a year from opening, against two to three for a distilled oil. An old citrus oil smells flat and faintly of cardboard." },
      { q: "What does phototoxic mean?", a: "Compounds in cold-pressed citrus react with UV light on skin, which can cause burning and lasting dark patches. It needs both the oil and sunlight, so a blend applied in the evening is a different proposition from one applied before going out. Each product page states its own limit." },
      { q: "Which oils are safe to put on skin during the day?", a: "Sweet orange and mandarin are the straightforward choices here — neither is meaningfully phototoxic. Everything else cold-pressed in this collection has a limit, listed on its own page." },
      { q: "Is lemongrass the same as citronella?", a: "No, though they are related grasses that smell similar. Lemongrass is Cymbopogon citratus, the one used in cooking. Citronella is C. winterianus, rougher and greener. Both are more irritating to skin than their freshness suggests." },
    ],
  },

  immunity: {
    lede:
      "Camphorous, green and medicinal in the best sense. These are the bottles that come out of the cupboard when the weather turns, and the collection where dilution matters most — several of these are the strongest oils we carry.",
    startHere: {
      id: "eucalyptus-clearing",
      why: "The oil most people buy once a year, when the house starts to feel closed up. Three drops in a bowl of hot water is the classic use, and it is the benchmark everything else in this collection is measured against.",
    },
    choosing: [
      { h: "Camphorous oils vary in harshness", p: "Eucalyptus is the sharpest, tea tree the most medicinal, niaouli and ravensara noticeably softer. If eucalyptus feels too strong, start with niaouli." },
      { h: "Warm spices need the lowest dilutions", p: "Clove bud and cinnamon leaf are sensitisers with ceilings of 0.5 and 0.6 per cent. These are not beginner oils, and sensitisation does not wear off." },
      { h: "Fennel carries the longest warning list", p: "Avoid in pregnancy and breastfeeding, with oestrogen-sensitive conditions, and around children. If any of that applies, coriander seed gives similar warmth without the restrictions." },
    ],
    uses: [
      { h: "Steam inhalation", p: "Three drops in a bowl of hot water, a towel over the head, a few minutes of breathing. Three — not ten." },
      { h: "Diffuse seasonally", p: "Four drops of eucalyptus with lemon and tea tree is the standard winter blend." },
      { h: "Surface sprays", p: "Tea tree, thyme and lemon in a spray bottle, where their strength is an advantage rather than a hazard." },
    ],
    faqs: [
      { q: "Do these oils treat colds or boost immunity?", a: "No, and we are not going to suggest otherwise. They smell clearing, and many people find steam comforting when congested — but the steam is doing most of that work, and neither will shorten an illness. Essential oils are not medicine." },
      { q: "Why do you call it the immunity collection then?", a: "Because it is what people come looking for, and pretending otherwise would just make the range harder to navigate. The name describes the shelf, not a claim about the contents." },
      { q: "Are these safe around children?", a: "Largely not. Eucalyptus, niaouli and ravensara are high in 1,8-cineole, which can affect breathing in babies and young children. Clove, cinnamon and thyme should be kept away from children entirely. Ask a doctor before diffusing any of these in a house with a small child." },
      { q: "Which are safe around cats and dogs?", a: "Tea tree is genuinely toxic to cats and dogs, including as vapour in a closed room. As a general rule we would not diffuse anything from this collection around pets without veterinary advice." },
    ],
  },

  skincare: {
    lede:
      "Two different things on one shelf: cold-pressed carrier oils that go on neat, and the precious essential oils worth diluting into them. If you are buying your first bottle for skin, it should be a carrier.",
    startHere: {
      id: "jojoba",
      why: "Buy the carrier before the essential oil. Jojoba is the default base — closest to the skin's own sebum, light enough not to sit on the surface, and stable enough to keep for years where seed oils turn in months.",
    },
    choosing: [
      { h: "Carriers go on neat; essential oils never do", p: "The seven carrier oils here are used by the spoonful. The five essential oils are used by the drop, diluted into those carriers at one or two per cent." },
      { h: "Pick a carrier by weight, not price", p: "Grapeseed is lightest and shortest-lived. Jojoba is the all-rounder. Sweet almond is richer and better for bodies than faces. Coconut sets solid below 24°C." },
      { h: "Patch-test everything, twice", p: "Once for the carrier, once for the blend. Apply to the inside of the forearm and wait a day before using anything new more widely." },
    ],
    uses: [
      { h: "A simple facial oil", p: "Six drops of essential oil per 30 ml of jojoba gives a one per cent blend, which is the sensible strength for a face." },
      { h: "Scalp and hair", p: "Five drops of rosemary into a tablespoon of jojoba, massaged in and left for thirty minutes before washing." },
      { h: "Body after a bath", p: "Sweet almond or coconut on damp skin, which is when an oil actually works — it seals rather than hydrates." },
    ],
    faqs: [
      { q: "What is the difference between a carrier oil and an essential oil?", a: "Carrier oils are pressed from seeds, nuts or kernels and are used neat, by the spoonful. Essential oils are distilled, extremely concentrated, and used by the drop — always diluted into a carrier before they touch skin." },
      { q: "Which carrier should I buy first?", a: "Jojoba, for most people. It suits the widest range of skin, it is light, and it keeps for years because it is technically a wax rather than a fat. Grapeseed if you find jojoba heavy; sweet almond if you want something richer for body use." },
      { q: "How much essential oil do I add?", a: "For the face, one per cent — about 6 drops per 30 ml of carrier. For the body, two per cent, around 12 drops per 30 ml. Lower for anything our product pages flag as a sensitiser." },
      { q: "Will these help with acne or scarring?", a: "We are not able to make claims of that kind and we will not. What we can tell you is what each oil is, where it came from, how it behaves on skin and how people use it. For a skin condition, see a dermatologist." },
    ],
  },
};
