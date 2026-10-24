/**
 * Every piece of content on the site lives here. The build reads this file and
 * writes one HTML page per product, per collection, and per standalone page.
 *
 * Product copy, usage notes, scent notes and photography are carried over from
 * the earlier Next.js build of this site. Prices are placeholders set for the
 * Indian market — the originals were GBP.
 */

export const site = {
  name: "Sarvha",
  tagline: "Small-batch essential oils",
  description:
    "Single-origin essential oils and cold-pressed carriers, bottled in small batches and shipped across India.",
  email: "hello@sarvha.com",
  phone: "+91 00000 00000",
  address: ["Mumbai, Maharashtra", "India"],
  url: "https://sarvha.com",
  currency: "₹",
  locale: "en-IN",
  freeShippingAt: 999,
};

export const nav = [
  { href: "/shop/", label: "Shop" },
  { href: "/collections/", label: "Collections" },
  { href: "/about/", label: "Our story" },
  { href: "/faq/", label: "FAQ" },
  { href: "/contact/", label: "Contact" },
];

export const categories = [
  {
    id: "relaxation",
    label: "Relaxation",
    blurb: "Oils that slow the evening down.",
    intro:
      "The oils we reach for when the day needs to end. Soft florals, dry woods and the kind of scent that makes a room feel quieter than it did a minute ago.",
    icon: "☾",
    color: "#ece6f4",
  },
  {
    id: "energy",
    label: "Energy",
    blurb: "Bright, sharp oils for the middle of the day.",
    intro:
      "Citrus peel and cold mint — the oils that cut through a stuffy room and a sluggish afternoon. Best diffused early, or whenever the wall arrives.",
    icon: "☀",
    color: "#f8e7d4",
  },
  {
    id: "immunity",
    label: "Immunity",
    blurb: "Seasonal support when the weather turns.",
    intro:
      "Camphorous, green and medicinal in the best sense. These are the bottles that come out of the cupboard the moment the seasons change.",
    icon: "≋",
    color: "#e0eef1",
  },
  {
    id: "skincare",
    label: "Skincare",
    blurb: "Treatments and carriers for face and body.",
    intro:
      "Cold-pressed carriers and the precious oils worth diluting into them. Everything here is meant to go on skin — safely, and in small amounts.",
    icon: "✿",
    color: "#e8eedd",
  },
];

/**
 * variants: [{ size, price, stock }] — stock 0 marks that size sold out.
 * image: product photography; falls back to generated bottle art if it fails.
 */
export const products = [
  {
    id: "lavender-fields", name: "Lavender Fields", botanical: "Lavandula angustifolia",
    category: "relaxation", featured: true,
    tagline: "Steam-distilled from high-altitude Provençal blooms.",
    desc: "Soft, powdery and unmistakably floral — the lavender note people picture when they imagine lavender, rather than the sharp medicinal version. Gentle enough for nightly use, complex enough to anchor a blend.",
    ingredients: ["100% pure Lavandula angustifolia flower oil"],
    usage: [
      "Add 4–6 drops to a diffuser an hour before bed.",
      "Dilute 2 drops in a teaspoon of carrier oil and massage into temples.",
      "Stir 8 drops into a warm bath with a handful of epsom salts.",
    ],
    notes: ["Powdery floral", "Fresh herb", "Soft balsamic base"],
    origin: "Provence, France", method: "Steam distilled",
    swatch: ["#9a8fc4", "#6d5fa3"], bg: "#ece6f4",
    image: { src: "https://images.unsplash.com/photo-1693567397897-61ea5c665078?auto=format&fit=crop&q=70&w=900", alt: "Amber dropper bottle of lavender oil on cream linen with dried lavender sprigs behind it" },
    variants: [{ size: "15 ml", price: 699, stock: 24 }, { size: "30 ml", price: 1299, stock: 11 }],
  },
  {
    id: "roman-chamomile", name: "Roman Chamomile", botanical: "Chamaemelum nobile",
    category: "relaxation", badge: "Rare",
    tagline: "Apple-sweet, deeply soothing, and rare.",
    desc: "It takes an extraordinary volume of flowers to fill a single bottle, which is why this remains our most precious offering. The scent is soft and faintly fruity — nothing like the tea.",
    ingredients: ["100% pure Chamaemelum nobile flower oil"],
    usage: [
      "Diffuse 2 drops — a little carries a long way.",
      "Dilute to 1% for a calming pulse-point roller.",
      "Blend with lavender for restless evenings.",
    ],
    notes: ["Green apple", "Hay", "Soft herbaceous"],
    origin: "Norfolk, England", method: "Steam distilled",
    swatch: ["#d9d08f", "#a89a4e"], bg: "#f2f0d8",
    image: { src: "https://images.unsplash.com/photo-1676803704427-496b1de33baa?auto=format&fit=crop&q=70&w=900", alt: "Open amber dropper bottle on wood with small white blossoms and green leaves behind" },
    variants: [{ size: "10 ml", price: 1499, stock: 6 }],
  },
  {
    id: "cedarwood-grounding", name: "Cedarwood Grounding", botanical: "Cedrus atlantica",
    category: "relaxation",
    tagline: "Dry Atlas cedar — the scent of a still forest.",
    desc: "Soft, woody, and quietly sweet. Where lavender calms the mind, cedarwood seems to settle the body. Especially good diffused low and slow through a long evening.",
    ingredients: ["100% pure Cedrus atlantica wood oil"],
    usage: [
      "Diffuse 4 drops in the hour before sleep.",
      "Dilute to 2% and massage into the soles of the feet.",
      "Add 3 drops to a wool dryer ball for scented linens.",
    ],
    notes: ["Dry cedar", "Sweet balsam", "Faint smoke"],
    origin: "Middle Atlas, Morocco", method: "Steam distilled",
    swatch: ["#c1a184", "#8a6a4e"], bg: "#efe6d8",
    image: { src: "https://images.unsplash.com/photo-1581514439794-f9777f7c22eb?auto=format&fit=crop&q=70&w=900", alt: "Amber dropper bottle on weathered wood with a conifer sprig behind it" },
    variants: [{ size: "15 ml", price: 599, stock: 18 }, { size: "30 ml", price: 1099, stock: 9 }],
  },
  {
    id: "sweet-orange-sunrise", name: "Sweet Orange Sunrise", botanical: "Citrus sinensis",
    category: "energy", featured: true,
    tagline: "Cold-pressed peel oil with an unmistakable lift.",
    desc: "Bright, sweet and immediately recognisable. A single drop reads instantly as sunlight — the easiest way to lift a room, a mood, or a sluggish afternoon.",
    ingredients: ["100% cold-pressed Citrus sinensis peel oil"],
    usage: [
      "Diffuse 5 drops through a morning work session.",
      "Blend 3 drops into an unscented body lotion.",
      "Combine with cinnamon and clove for a warming winter diffusion.",
    ],
    notes: ["Candied peel", "Bright juice", "Clean sweetness"],
    origin: "Sicily, Italy", method: "Cold pressed",
    swatch: ["#f0a85c", "#d97b2b"], bg: "#f8e7d4",
    image: { src: "https://images.unsplash.com/photo-1608571423539-e951b9b3871e?auto=format&fit=crop&q=70&w=900", alt: "Amber dropper bottle on a wooden pedestal against a cream wall patterned with leaf shadows" },
    variants: [{ size: "15 ml", price: 449, stock: 40 }, { size: "30 ml", price: 799, stock: 17 }],
  },
  {
    id: "peppermint-spark", name: "Peppermint Spark", botanical: "Mentha piperita",
    category: "energy", featured: true,
    tagline: "Pacific Northwest mint with a genuine cooling bite.",
    desc: "Cold, clean and immediate — you feel this one on the back of your neck before you have finished inhaling. Our go-to for the mid-afternoon wall.",
    ingredients: ["100% pure Mentha piperita leaf oil"],
    usage: [
      "Inhale a single drop from the palms before a long drive.",
      "Diffuse 3 drops with rosemary while studying.",
      "Dilute to 2% and massage into tired legs.",
    ],
    notes: ["Sharp menthol", "Green stem", "Cool sweetness"],
    origin: "Willamette Valley, Oregon", method: "Steam distilled",
    swatch: ["#8fd0bf", "#3d9b86"], bg: "#e1f1ea",
    image: { src: "https://images.unsplash.com/photo-1605039982749-c2fe1dd2a588?auto=format&fit=crop&q=70&w=900", alt: "Glass dropper of golden oil on dark wood with fresh green leaves behind" },
    variants: [{ size: "15 ml", price: 499, stock: 31 }, { size: "30 ml", price: 899, stock: 8 }],
  },
  {
    id: "lemon-clarity", name: "Lemon Clarity", botanical: "Citrus limon",
    category: "energy",
    tagline: "Sicilian peel, pressed at peak acidity.",
    desc: "Cleaner and greener than most lemon oils, with none of the candied quality that comes from over-ripe fruit. Brilliant for cutting through a stuffy room.",
    ingredients: ["100% cold-pressed Citrus limon peel oil"],
    usage: [
      "Diffuse 5 drops while cleaning or cooking.",
      "Blend with rosemary and peppermint for focus.",
      "Add 4 drops to a vinegar-based surface spray.",
    ],
    notes: ["Zest", "Green rind", "Bright acid"],
    origin: "Sicily, Italy", method: "Cold pressed",
    swatch: ["#f2d97a", "#d4ac2e"], bg: "#f2f0d8",
    image: { src: "https://images.unsplash.com/photo-1633423411797-9a7317784d2b?auto=format&fit=crop&q=70&w=900", alt: "Dropper releasing bright yellow citrus oil onto a cream surface patterned with leaf shadows" },
    variants: [{ size: "15 ml", price: 449, stock: 22 }, { size: "30 ml", price: 799, stock: 0 }],
  },
  {
    id: "eucalyptus-clearing", name: "Eucalyptus Clearing", botanical: "Eucalyptus globulus",
    category: "immunity", featured: true,
    tagline: "A deep, cooling breath of Tasmanian blue gum.",
    desc: "High in 1,8-cineole, this is the oil we reach for the moment the seasons turn. Sharp and camphorous on first inhale, then surprisingly soft as it settles.",
    ingredients: ["100% pure Eucalyptus globulus leaf oil"],
    usage: [
      "Add 3 drops to a bowl of steaming water and inhale under a towel.",
      "Diffuse 4 drops alongside lemon and tea tree.",
      "Dilute to 2% in carrier oil for a warming chest rub.",
    ],
    notes: ["Camphor", "Green leaf", "Cool mineral"],
    origin: "Blue Mountains, Australia", method: "Steam distilled",
    swatch: ["#7fb8a4", "#3f8570"], bg: "#e0eef1",
    image: { src: "https://images.unsplash.com/photo-1674906027853-4bd48f476244?auto=format&fit=crop&q=70&w=900", alt: "Essential oil bottle surrounded by eucalyptus sprigs and blooms on a pale background" },
    variants: [{ size: "15 ml", price: 499, stock: 27 }, { size: "30 ml", price: 899, stock: 9 }],
  },
  {
    id: "tea-tree-shield", name: "Tea Tree Shield", botanical: "Melaleuca alternifolia",
    category: "immunity",
    tagline: "Australian-grown, terpinen-rich, endlessly useful.",
    desc: "The workhorse of any collection. Sharp, green and medicinal in the way tea tree should be — the smell most people associate with getting on top of something.",
    ingredients: ["100% pure Melaleuca alternifolia leaf oil"],
    usage: [
      "Dilute to 1% as a targeted spot treatment.",
      "Add 5 drops to a homemade surface spray.",
      "Diffuse with eucalyptus and lemon through cold season.",
    ],
    notes: ["Medicinal green", "Fresh wood", "Earthy base"],
    origin: "New South Wales, Australia", method: "Steam distilled",
    swatch: ["#a3c48b", "#5f8a4c"], bg: "#e8eedd",
    image: { src: "https://images.unsplash.com/photo-1671493234842-6e600f721982?auto=format&fit=crop&q=70&w=900", alt: "Amber essential oil bottle resting on natural woven linen" },
    variants: [{ size: "15 ml", price: 549, stock: 18 }, { size: "30 ml", price: 999, stock: 6 }],
  },
  {
    id: "ginger-warmth", name: "Ginger Warmth", botanical: "Zingiber officinale",
    category: "immunity",
    tagline: "Steam-distilled fresh rhizome, spicy and rounded.",
    desc: "Distilled from fresh rather than dried root, which keeps the bright, almost lemony top note intact. Warming without the dustiness of the powdered spice.",
    ingredients: ["100% pure Zingiber officinale root oil"],
    usage: [
      "Dilute to 1.5% for a warming abdominal massage.",
      "Diffuse 2 drops with orange on cold mornings.",
      "Blend into a winter chest rub with eucalyptus.",
    ],
    notes: ["Fresh spice", "Lemon peel", "Warm root"],
    origin: "Kerala, India", method: "Steam distilled",
    swatch: ["#e6b06a", "#b87a33"], bg: "#f5eed8",
    image: { src: "https://images.unsplash.com/photo-1671493235081-5842463637cd?auto=format&fit=crop&q=70&w=900", alt: "Warm amber essential oil bottle lying on natural woven linen" },
    variants: [{ size: "10 ml", price: 749, stock: 14 }],
  },
  {
    id: "rosehip-renewal", name: "Rosehip Renewal", botanical: "Rosa canina",
    category: "skincare", featured: true,
    tagline: "Cold-pressed Chilean rosehip, unrefined and unfiltered.",
    desc: "A carrier oil that behaves like a treatment. Naturally rich in vitamin A and essential fatty acids, it absorbs quickly and leaves skin looking rested rather than greasy.",
    ingredients: ["100% cold-pressed unrefined Rosa canina seed oil"],
    usage: [
      "Press 3–4 drops into damp skin as the last step at night.",
      "Use as the base for a 1% dilution of your favourite floral oil.",
      "Massage into scars and dry patches daily.",
    ],
    notes: ["Warm seed", "Faint earth", "Nutty finish"],
    origin: "Bío Bío, Chile", method: "Cold pressed",
    swatch: ["#e2947e", "#bf5f4c"], bg: "#f5e3e8",
    image: { src: "https://images.unsplash.com/photo-1624454002302-36b824d7bd0a?auto=format&fit=crop&q=70&w=900", alt: "Amber dropper bottle and jar on hessian with green leaves resting behind" },
    variants: [{ size: "30 ml", price: 899, stock: 25 }, { size: "100 ml", price: 2299, stock: 10 }],
  },
  {
    id: "frankincense-quiet", name: "Frankincense Quiet", botanical: "Boswellia carterii",
    category: "skincare", badge: "Premium",
    tagline: "Warm, resinous, and quietly grounding.",
    desc: "Warm, resinous, faintly citrus at the top. Prized in skincare for its effect on tone and texture, and by nearly everyone else for how still it makes a room feel.",
    ingredients: ["100% pure Boswellia carterii resin oil"],
    usage: [
      "Add 2 drops to your evening facial oil.",
      "Diffuse 3 drops during meditation or breathwork.",
      "Blend with rosehip for a restorative night treatment.",
    ],
    notes: ["Warm resin", "Dry citrus", "Soft smoke"],
    origin: "Dhofar, Oman", method: "Steam distilled",
    swatch: ["#d8bd8e", "#a8834a"], bg: "#efe6d8",
    image: { src: "https://images.unsplash.com/photo-1512867957657-38dbae50a35b?auto=format&fit=crop&q=70&w=900", alt: "Open amber oil bottle in warm light with foliage softly blurred behind" },
    variants: [{ size: "10 ml", price: 1299, stock: 7 }, { size: "15 ml", price: 1799, stock: 3 }],
  },
  {
    id: "geranium-balance", name: "Geranium Balance", botanical: "Pelargonium graveolens",
    category: "skincare",
    tagline: "Rose-like Egyptian geranium for balanced skin.",
    desc: "The most rose-adjacent oil we carry, at a fraction of the cost of true rose. Loved for how it evens out combination skin and how convincingly floral it smells.",
    ingredients: ["100% pure Pelargonium graveolens leaf oil"],
    usage: [
      "Add 2 drops to a 30 ml bottle of rosehip oil.",
      "Diffuse 3 drops with bergamot and lavender.",
      "Dilute to 1% for a daily facial mist.",
    ],
    notes: ["Green rose", "Mint edge", "Soft powder"],
    origin: "Beni Suef, Egypt", method: "Steam distilled",
    swatch: ["#dba0b4", "#b26586"], bg: "#f5e3e8",
    image: { src: "https://images.unsplash.com/photo-1676852148076-7a92002419f3?auto=format&fit=crop&q=70&w=900", alt: "Amber oil bottles on linen beside a bowl of dried florals and a pink rose" },
    variants: [{ size: "15 ml", price: 899, stock: 12 }],
  },
];

/** The homepage "Oil Library" — five columns that expand on click. */
export const library = [
  { id: "lavender-fields", name: "Lavender", story: "sleep",
    blurb: "Cut at first bloom and distilled the same day. Softly floral, with a green herbaceous edge.",
    image: "https://images.unsplash.com/photo-1676852148076-7a92002419f3?auto=format&fit=crop&q=70&w=1000" },
  { id: "eucalyptus-clearing", name: "Eucalyptus", story: "breath",
    blurb: "Sharp and camphorous at the top. The oil that makes a room feel like it has windows open.",
    image: "https://images.unsplash.com/photo-1605039982749-c2fe1dd2a588?auto=format&fit=crop&q=70&w=1000" },
  { id: "sweet-orange-sunrise", name: "Orange", story: "morning",
    blurb: "Cold-pressed peel with a trace of neroli absolute: bright citrus, then white blossom.",
    image: "https://images.unsplash.com/photo-1633423411797-9a7317784d2b?auto=format&fit=crop&q=70&w=1000" },
  { id: "cedarwood-grounding", name: "Cedar", story: "quiet",
    blurb: "Dry cedar heartwood over damp vetiver root. The note that stays in the room longest.",
    image: "https://images.unsplash.com/photo-1581514439794-f9777f7c22eb?auto=format&fit=crop&q=70&w=1000" },
  { id: "peppermint-spark", name: "Peppermint", story: "focus",
    blurb: "Steam-distilled from first-cut leaf. Cold, clean and immediate.",
    image: "https://images.unsplash.com/photo-1512867957657-38dbae50a35b?auto=format&fit=crop&q=70&w=1000" },
];

/**
 * Carried over from the previous build. The enquiry-specific questions were
 * dropped, since this site sells through a cart.
 */
export const faqs = [
  { cat: "Product quality & sourcing", q: "Are your essential oils 100% pure?",
    a: "Yes — all our oils are 100% pure, undiluted, and free from synthetic additives or fillers." },
  { cat: "Product quality & sourcing", q: "Where do you source your oils from?",
    a: "Our oils are carefully sourced from a small number of trusted suppliers, chosen for the quality and purity of what they produce. We are a young business and our range is deliberately small, so we can speak honestly about everything we carry. If you want to know more about a particular oil, just ask." },
  { cat: "Product quality & sourcing", q: "Are your products tested for quality?",
    a: "Purity is the whole reason we do this, so we buy from suppliers who can tell us what is in an oil and we ask for the documentation that comes with it. We are a young business and we are not going to overstate our testing programme — if you want to know exactly what we hold on a particular oil, ask us and we will tell you straight." },
  { cat: "Product quality & sourcing", q: "What's the difference between essential oils and fragrance oils?",
    a: "Essential oils are natural extracts from plants, while fragrance oils are often synthetic. We only sell 100% natural essential oils — no synthetic fragrance blends." },
  { cat: "Product quality & sourcing", q: "Are your oils cruelty-free?",
    a: "Yes — none of our products are tested on animals." },
  { cat: "Product quality & sourcing", q: "Do you offer organic-certified oils?",
    a: "We're happy to share sourcing and certification details for any specific oil — just write to us and ask." },

  { cat: "Usage & safety", q: "How do I use essential oils safely?",
    a: "Most essential oils should be diluted with a carrier oil before applying to skin, and are not meant for internal use unless specifically labelled. Every product page includes usage guidance — always patch-test before first use." },
  { cat: "Usage & safety", q: "Are your oils safe during pregnancy?",
    a: "Some essential oils are not recommended during pregnancy. Please consult a healthcare provider before use, and do get in touch if you'd like guidance on a specific oil." },
  { cat: "Usage & safety", q: "Can I use these oils around children or pets?",
    a: "Certain oils aren't safe around children or pets. Write to us and we'll advise based on the specific oil you're interested in." },
  { cat: "Usage & safety", q: "How long do essential oils last once opened?",
    a: "Most essential oils stay potent for 1–3 years if stored properly — cool, dark and tightly sealed. Citrus oils have a shorter shelf life than woody or floral oils." },
  { cat: "Usage & safety", q: "How should I store my essential oils?",
    a: "Keep bottles tightly closed, away from direct sunlight and heat, ideally in a cool, dark cabinet or drawer." },
  { cat: "Usage & safety", q: "Can I mix different essential oils together?",
    a: "Yes, many oils blend well together. If you're unsure about a specific combination, just ask — we're happy to suggest ratios." },

  { cat: "Shipping & delivery", q: "Do you ship across India?",
    a: "Yes, we ship across India, and internationally on request — write to us and we'll confirm feasibility and cost." },
  { cat: "Shipping & delivery", q: "What are the shipping charges?",
    a: "Shipping is free on orders over ₹999. Below that, charges are calculated at checkout based on your location." },
  { cat: "Shipping & delivery", q: "How long does delivery take?",
    a: "Orders are dispatched within two business days. Delivery usually takes a further three to five days depending on where you are." },
  { cat: "Shipping & delivery", q: "How will I know once my order has shipped?",
    a: "We'll keep you updated by email once your order is confirmed and dispatched." },

  { cat: "Returns & support", q: "What if I'm not satisfied with my purchase?",
    a: "If there's a genuine issue with your order, we'll gladly arrange a replacement. Just reach out and we'll make it right." },
  { cat: "Returns & support", q: "Can I order in bulk?",
    a: "Yes — write to us with the quantity you need and we'll come back with bulk pricing." },
  { cat: "Returns & support", q: "How can I contact you?",
    a: "Email us at hello@sarvha.com, or use the contact form. We read everything and usually reply within a day or two." },
];

/** Homepage "how we work" band. */
export const steps = [
  { n: "01", h: "Sourced", p: "Bought from a small number of growers and distillers we can name." },
  { n: "02", h: "Checked", p: "We ask for the documentation that comes with every batch." },
  { n: "03", h: "Bottled", p: "Decanted into amber glass in small batches, labelled by hand." },
  { n: "04", h: "Shipped", p: "Packed and dispatched from Mumbai within two business days." },
];

// ---------- Derived helpers, shared by the build and the browser ----------
export const bySlug = (id) => products.find((p) => p.id === id);
export const inCategory = (cat) => products.filter((p) => p.category === cat);
export const fromPrice = (p) => Math.min(...p.variants.map((v) => v.price));
export const inStock = (p) => p.variants.some((v) => v.stock > 0);
export const firstAvailable = (p) => p.variants.find((v) => v.stock > 0) || p.variants[0];
export const categoryOf = (id) => categories.find((c) => c.id === id);
export const money = (n) => site.currency + n.toLocaleString(site.locale);
