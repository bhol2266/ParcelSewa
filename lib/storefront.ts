export const SUPPORT_URL = "https://wa.me/9779713889720";

// Keep festival messaging here so the homepage and offers page stay in sync.
// First-order discount is confirmed by the team in the customer's quote.
export const festivalCampaign = {
  eyebrow: "Dashain & Tihar first-order offer",
  headline: "10% off",
  title: "the service fee on your first order.",
  description: "Celebrate with a new outfit, a thoughtful gift, or a little something for home. Shop your favourite Indian stores and enjoy 10% off the ParcelSewa service fee on your first order.",
  offerCode: "FESTIVAL_FIRST_ORDER",
  orderUrl: "/order?offer=festival-first-order",
  terms: "For first-time ParcelSewa customers. The discount applies to the ParcelSewa service fee only; product, shipping, delivery, and other charges are unchanged. Our team confirms eligibility and the discounted service fee in your quote before purchase.",
};

export const festivalArtwork = [
  { src: "/festivals/dashain-artwork.webp", label: "Dashain", caption: "Blessings & togetherness", alt: "Dashain-inspired artwork of red tika, fresh jamara, and marigolds beside a carved Nepali window" },
  { src: "/festivals/tihar-artwork.webp", label: "Tihar", caption: "A celebration of light", alt: "Tihar-inspired artwork of a Nepali doorway decorated with marigolds, glowing diyas, and colourful rangoli" },
] as const;

export const shoppingEdits = [
  { title: "Dress for the celebration", category: "Fashion & accessories", description: "Find festive kurtas, sarees, shoes, and accessories. Check the size chart before sharing your link.", store: "Explore Myntra", url: "https://www.myntra.com/", image: "/shopping/festive-fashion.webp", alt: "Festive fashion illustration featuring an embroidered kurta, terracotta saree, and gold-toned accessories" },
  { title: "Make home feel festive", category: "Home & living", description: "Explore lights, decor, and useful home finds. Share dimensions and quantity so we can review shipping.", store: "Explore Amazon India", url: "https://www.amazon.in/", image: "/shopping/festive-home.webp", alt: "Festive home décor illustration with glowing clay lamps, marigolds, and a navy woven cushion" },
  { title: "Find their next favourite", category: "Gifts & everyday finds", description: "Browse accessories, gadgets, and gifts for your loved ones. Send the exact variant for a personalised quote.", store: "Explore Flipkart", url: "https://www.flipkart.com/", image: "/shopping/festive-gifts.webp", alt: "Festive gifting illustration with ribbon-wrapped gift boxes, headphones, and a leather card holder" },
] as const;

export const shoppingSteps = [
  { title: "Find it in India", description: "Choose your product from an Indian store. Copy the link and note the size, colour, and quantity." },
  { title: "Request your NPR quote", description: "Send your link and delivery location. Our team reviews the item and confirms the cost." },
  { title: "Confirm your order", description: "Review the quote and payment details with our team before we purchase on your behalf." },
  { title: "We bring it to Nepal", description: "We coordinate the purchase, cross-border handling, and delivery. Contact support for updates." },
];

export const storefrontFaqs = [
  { question: "Which Indian stores can I shop from?", answer: "You can send links from Amazon India, Flipkart, Myntra, Ajio, and other Indian stores. Our team confirms whether the seller, item, and delivery route can be supported before purchase." },
  { question: "Is the calculator amount a final quote?", answer: "The calculator is a planning estimate using a fixed INR-to-NPR conversion and the current calculator fee rules. Product availability, shipping, and handling must be confirmed by our team before you pay." },
  { question: "How do I request an order?", answer: "Use the order request form with your product link, quantity, delivery location, WhatsApp number, and any variant details. Your request is saved and WhatsApp opens with a prepared message. Send that message to continue with our team." },
  { question: "Will my order arrive before Dashain or Tihar?", answer: "Please ask our team before ordering for a specific festival date. Seller dispatch, customs, and local courier schedules can affect arrival. A festival banner does not guarantee delivery by a particular day." },
  { question: "How do I pay?", answer: "Our team confirms the available payment method and payable NPR amount with your quote. The request form itself does not collect a payment." },
  { question: "What should I do if there is a problem with my order?", answer: "Contact support with your order details and photos of the product and packaging. Return and refund options depend on the item, seller, and applicable policy; review the Returns & Refund Policy before ordering." },
];
