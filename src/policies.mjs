/**
 * The four policies India's Consumer Protection (E-Commerce) Rules 2020
 * require, and that Razorpay will not activate a live account without.
 *
 * Content lives here as data, the way guides do, because several thousand
 * words inlined into build.mjs makes that file unreadable.
 *
 * ---------------------------------------------------------------------------
 * TODO blocks are not decoration. Every business fact these pages need that
 * nobody has stated yet is marked ["todo", "..."] and renders visibly on the
 * page. They are deliberately loud: a policy that quietly invents a return
 * window is a commitment nobody agreed to, and the invention is impossible to
 * spot later. Search this file for "todo" before going live.
 * ---------------------------------------------------------------------------
 *
 * Everything not marked TODO is drawn from src/data.mjs, the FAQ, or the
 * behaviour of the code itself (what the schema stores, what the cookie does,
 * what checkout sends to Razorpay).
 *
 * Block types, as in guides.mjs: ["p", text] | ["ul", [items]] |
 * ["h3", text] | ["note", text] | ["todo", whatIsMissing]
 */

import { site } from "./data.mjs";

const UPDATED = "2026-10-27";

const addressLine = [
  ...site.address.lines,
  `${site.address.city} – ${site.address.postcode}`,
  site.address.country,
].join(", ");

/** Repeated verbatim in all four, because the Rules require it in each. */
const grievance = [
  ["h3", "Grievance officer"],
  ["todo",
    "Grievance Officer's name and designation. The Consumer Protection " +
    "(E-Commerce) Rules 2020 require a named individual, not a department."],
  ["p",
    `Write to <a href="mailto:${site.email}">${site.email}</a>, or by post to ` +
    `${site.name}, ${addressLine}. You can also call ${site.phones[0]}.`],
  ["todo",
    "Acknowledgement and resolution timeframes. The Rules expect a complaint " +
    "to be acknowledged within 48 hours and resolved within one month of " +
    "receipt. Confirm the times you can actually meet before publishing — the " +
    "FAQ currently promises a reply 'within a day or two' for ordinary email."],
];

export const policies = [
  /* ------------------------------------------------------------- privacy */
  {
    slug: "privacy",
    nav: "Privacy",
    title: "Privacy Policy — What We Collect",
    description:
      `What ${site.name} collects when you shop with us, why we hold it, who else ` +
      `sees it, and how to get it deleted. Plain terms, no boilerplate.`,
    updated: UPDATED,
    lede:
      "This describes what we collect, why, and what we do not do with it. It " +
      "covers the website only.",
    sections: [
      {
        h: "Who we are",
        body: [
          ["todo",
            "Registered legal entity name and type (sole proprietorship, " +
            "partnership, private limited), and the registered address if it " +
            "differs from the address below."],
          ["p",
            `${site.name} sells essential oils online in India from ${addressLine}. ` +
            `For anything in this policy, write to ` +
            `<a href="mailto:${site.email}">${site.email}</a>.`],
        ],
      },
      {
        h: "What we collect",
        body: [
          ["p", "Only what an order or an enquiry actually needs."],
          ["h3", "If you create an account"],
          ["ul", [
            "Your name and email address.",
            "Your mobile number, if you give one.",
            "A scrambled form of your password. We never store the password itself, and cannot read it or recover it for you.",
          ]],
          ["h3", "If you place an order"],
          ["ul", [
            "Your delivery address and phone number.",
            "What you bought, what it cost, and when.",
            "Any delivery note you add at checkout.",
          ]],
          ["h3", "If you write to us or subscribe"],
          ["ul", [
            "Your name, email address and your message.",
            "Your email address alone, if you join the newsletter.",
          ]],
          ["note",
            "We do not collect your date of birth, your gender, your location, " +
            "or anything else we have no use for. There is no advertising or " +
            "analytics tracking on this site at all — no Google Analytics, no " +
            "advertising pixels, no third-party scripts watching what you look at."],
        ],
      },
      {
        h: "Card details",
        body: [
          ["p",
            "We never see them. Payments are handled by Razorpay, which collects " +
            "your card or UPI details directly on their own systems. Nothing " +
            "about your payment instrument reaches our servers or our database — " +
            "we are told only whether a payment succeeded and for how much."],
          ["p",
            "Razorpay handles that data under their own privacy policy, which " +
            "applies to the payment step."],
        ],
      },
      {
        h: "Cookies and what your browser stores",
        body: [
          ["p",
            "One cookie, and only once you log in. It holds a random token that " +
            "tells us you are signed in. It cannot be read by scripts, it is " +
            "only sent over an encrypted connection, and it expires after 30 days."],
          ["p",
            "Your browser also keeps your shopping cart, and your first name if " +
            "you are logged in, in its own local storage. Both stay on your " +
            "device and are never sent to us. Clearing your browser data removes " +
            "them."],
          ["note", "There are no advertising or tracking cookies on this site."],
        ],
      },
      {
        h: "Who else sees your data",
        body: [
          ["p", "As few people as possible, and only to get your order to you."],
          ["ul", [
            "Razorpay, to take the payment.",
            "The courier, to deliver the parcel — they get your name, address and phone number.",
          ]],
          ["todo",
            "Name the courier or couriers you use, and name your hosting and " +
            "database providers and the country their servers are in. A privacy " +
            "policy has to say who processes the data and where."],
          ["p",
            "We do not sell your data, rent it, or share it with anyone for " +
            "marketing. Nobody gets your details to advertise to you."],
        ],
      },
      {
        h: "How long we keep it",
        body: [
          ["todo",
            "How long order records are retained. Tax rules set a floor on this, " +
            "so check what your accountant requires before stating a period."],
          ["p",
            "Newsletter subscriptions are kept until you unsubscribe. Messages " +
            "you send us are kept so we have the history if you write again."],
        ],
      },
      {
        h: "What you can ask us to do",
        body: [
          ["ul", [
            "Tell you what we hold about you.",
            "Correct anything that is wrong.",
            "Delete your account and your personal details.",
            "Stop emailing you.",
          ]],
          ["p",
            `Email <a href="mailto:${site.email}">${site.email}</a> and ask. We ` +
            `may have to keep order records we are legally required to retain, ` +
            `and we will say so if that applies.`],
        ],
      },
      { h: "Grievances", body: grievance },
    ],
  },

  /* --------------------------------------------------------------- terms */
  {
    slug: "terms",
    nav: "Terms",
    title: "Terms & Conditions",
    description:
      `The terms you agree to when you buy from ${site.name} — orders, pricing, ` +
      `delivery, what we claim about our oils and what we deliberately do not.`,
    updated: UPDATED,
    lede:
      "These apply when you use this site or place an order. They are written to " +
      "be read, not to be impressive.",
    sections: [
      {
        h: "Who you are buying from",
        body: [
          ["todo",
            "Registered legal entity name and type, and registration number if " +
            "you have one. This is the party the customer contracts with."],
          ["p", `${site.name}, ${addressLine}.`],
        ],
      },
      {
        h: "Placing an order",
        body: [
          ["p",
            "You need an account to order. Browsing the site and filling a cart " +
            "do not require one."],
          ["p",
            "An order is an offer to buy. It is accepted when we take payment " +
            "and confirm it. If something has sold out between your adding it " +
            "and paying for it, we will tell you and refund that part."],
          ["p",
            "We may decline an order — if stock has gone, if the delivery " +
            "address is somewhere we cannot reach, or if we believe the order " +
            "is not genuine."],
        ],
      },
      {
        h: "Prices",
        body: [
          ["p",
            `Prices are in Indian rupees. Shipping is free on orders of ` +
            `₹${site.freeShippingAt} and over; below that a flat ₹${site.shippingFlat} ` +
            `is added at checkout.`],
          ["todo",
            "Whether the displayed prices include GST, and your GSTIN if you are " +
            "registered. A price that silently excludes tax is a problem at " +
            "checkout, and Razorpay will ask about your GST status."],
          ["p",
            "We may change prices at any time, but never on an order you have " +
            "already paid for. If an oil is listed at an obviously wrong price, " +
            "we will contact you rather than silently cancel."],
        ],
      },
      {
        h: "What we say about our oils",
        body: [
          ["p",
            "We describe how our oils smell, where they come from, and how " +
            "people use them. We do not make medical claims, because essential " +
            "oils are not medicine and we are not permitted to present them as " +
            "treatment for any condition."],
          ["p",
            "Nothing on this site is medical advice. If you are pregnant, " +
            "treating a child, or managing a health condition, ask a doctor " +
            "before using essential oils."],
          ["note",
            "Our oils are for external use, properly diluted, unless a product " +
            "page says otherwise. Each product page carries its own safety note. " +
            "Please read it."],
        ],
      },
      {
        h: "Your account",
        body: [
          ["p",
            "Keep your password to yourself. Anything done through your account " +
            "is treated as done by you. Tell us at once if you think someone " +
            "else has access."],
          ["p",
            "We may suspend an account that is being used to abuse the site or " +
            "anyone working for us."],
        ],
      },
      {
        h: "Delivery",
        body: [
          ["p",
            "We ship across India, and internationally on request — write to us " +
            "and we will confirm whether we can and what it costs. Orders are " +
            "dispatched within two business days and usually arrive three to " +
            "five days after that."],
          ["p", `The full terms are in our <a href="/shipping/">Shipping Policy</a>.`],
        ],
      },
      {
        h: "Returns",
        body: [
          ["p",
            `Set out in our <a href="/refunds/">Refund & Cancellation Policy</a>, ` +
            `which forms part of these terms.`],
        ],
      },
      {
        h: "Things we are not liable for",
        body: [
          ["p",
            "Using an essential oil in a way its product page warns against — " +
            "undiluted on skin, internally, on a child, or on an animal — is " +
            "your responsibility, not ours."],
          ["p",
            "We are not liable for delays caused by the courier, by weather, or " +
            "by anything else outside our control, though we will help you chase " +
            "a parcel that has gone astray."],
          ["todo",
            "Have a lawyer review this section and the governing-law line below. " +
            "Limitation of liability is the one part of these terms where " +
            "ordinary English can be legally insufficient."],
        ],
      },
      {
        h: "Governing law",
        body: [
          ["p",
            "These terms are governed by Indian law, and the courts at New Delhi " +
            "have jurisdiction."],
        ],
      },
      { h: "Grievances", body: grievance },
    ],
  },

  /* ------------------------------------------------------------- refunds */
  {
    slug: "refunds",
    nav: "Refunds",
    title: "Refund & Cancellation Policy",
    description:
      `How to cancel an order with ${site.name}, when we accept a return, and how ` +
      `and when your money comes back.`,
    updated: UPDATED,
    lede:
      "What happens if you change your mind, or if something arrives wrong.",
    sections: [
      {
        h: "Cancelling before dispatch",
        body: [
          ["todo",
            "Whether an order can be cancelled before it is dispatched, and how " +
            "— reply to the confirmation, or a cutoff time? Orders are dispatched " +
            "within two business days, so this window is short and needs stating " +
            "exactly."],
          ["p",
            `Until that is settled, write to ` +
            `<a href="mailto:${site.email}">${site.email}</a> as soon as you can ` +
            `and we will stop the parcel if it has not already gone.`],
        ],
      },
      {
        h: "If something is wrong with your order",
        body: [
          ["p",
            "If a bottle arrives broken, leaking, or is not what you ordered, we " +
            "will put it right — tell us and we will arrange a replacement."],
          ["p",
            "Please tell us quickly, with a photograph if something is damaged. " +
            "It is much easier to resolve a damaged parcel in the first few days " +
            "than weeks later."],
          ["todo",
            "The window for reporting a damaged or wrong item — how many days " +
            "from delivery? And whether the customer keeps, returns or disposes " +
            "of a leaking bottle."],
        ],
      },
      {
        h: "If you have simply changed your mind",
        body: [
          ["todo",
            "The returns window in days, and — the important one — whether an " +
            "opened bottle can be returned at all. Essential oils are a product " +
            "where many sellers refuse opened returns on hygiene and " +
            "contamination grounds. That is a legitimate position, but it must be " +
            "stated here plainly, before purchase, not discovered afterwards."],
          ["todo",
            "Who pays return postage on a change-of-mind return."],
        ],
      },
      {
        h: "How refunds are paid",
        body: [
          ["todo",
            "Refund method — back to the original payment method, or store " +
            "credit? — and how many working days it takes from approval. Razorpay " +
            "returns funds to the original instrument, and the bank then takes " +
            "its own time; state the end-to-end figure you can actually meet."],
          ["p",
            "Where shipping was charged, we will say when we refund it and when " +
            "we do not, once the above is settled."],
        ],
      },
      {
        h: "Things we cannot refund",
        body: [
          ["todo",
            "The exclusions — for example oils bought on sale, bulk or wholesale " +
            "orders, or anything made to order. Leave this out entirely rather " +
            "than guessing: an exclusion you did not intend is unenforceable, and " +
            "one you did intend but did not state is unusable."],
        ],
      },
      { h: "Grievances", body: grievance },
    ],
  },

  /* ------------------------------------------------------------ shipping */
  {
    slug: "shipping",
    nav: "Shipping",
    title: "Shipping Policy — Charges & Times",
    description:
      `What ${site.name} charges for delivery, how long it takes, where we ship, ` +
      `and what happens when a parcel goes missing.`,
    updated: UPDATED,
    lede: "Where we ship, what it costs, and how long it takes.",
    sections: [
      {
        h: "Where we ship",
        body: [
          ["p",
            "Across India. We also ship internationally on request — write to us " +
            "and we will confirm whether we can reach you and what it would cost."],
        ],
      },
      {
        h: "What it costs",
        body: [
          ["p",
            `Free on orders of ₹${site.freeShippingAt} and over. Below that, a flat ` +
            `₹${site.shippingFlat} is added at checkout, wherever in India you are.`],
          ["todo",
            "CONFLICT — resolve before publishing. The FAQ says charges below " +
            "₹999 are 'calculated at checkout based on your location'. The code " +
            "charges a flat ₹79 regardless of location. This page states the flat " +
            "fee, because that is what the checkout actually does. Either change " +
            "the FAQ to match, or change the code to charge by location — but " +
            "the two cannot keep disagreeing once customers can read both."],
          ["todo",
            "Confirm ₹79 is the fee you want. It was chosen as a placeholder so " +
            "a total could be calculated; it has never been a decision."],
        ],
      },
      {
        h: "How long it takes",
        body: [
          ["p",
            "Orders are dispatched from Delhi within two business days. Delivery " +
            "usually takes a further three to five days, depending on where you " +
            "are. Remote pin codes take longer."],
          ["p",
            "Business days are Monday to Friday. Orders placed on a weekend or a " +
            "public holiday are dispatched from the next working day."],
        ],
      },
      {
        h: "Who delivers",
        body: [
          ["todo",
            "Name the courier or couriers, and say whether a tracking number is " +
            "shared and how. The admin screen already records a tracking " +
            "reference against dispatched orders, so there is something to share."],
        ],
      },
      {
        h: "If a parcel is late or missing",
        body: [
          ["p",
            `Write to <a href="mailto:${site.email}">${site.email}</a> with your ` +
            `order details and we will chase it with the courier.`],
          ["todo",
            "How long after the expected date you will wait before treating a " +
            "parcel as lost, and what happens then — replacement or refund."],
        ],
      },
      {
        h: "Addresses",
        body: [
          ["p",
            "Please check your address and phone number before paying. We " +
            "dispatch to the address you give us, and a wrong one usually means " +
            "the parcel comes back to us."],
          ["p",
            "If you spot a mistake, tell us straight away — we can usually " +
            "correct it before dispatch."],
        ],
      },
      { h: "Grievances", body: grievance },
    ],
  },
];

export const policyBySlug = (slug) => policies.find((p) => p.slug === slug);
