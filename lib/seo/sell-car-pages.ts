/**
 * Seller-intent landing pages for cars.
 *
 * Every car page on Shopi so far targets *buyer* intent — "Toyota Premio for
 * sale in Kenya" (see search-intent-pages.ts). That misses the other half of a
 * marketplace: the person who owns a Premio and types "sell my Premio" or "how
 * much is my Premio worth". Those queries have lower volume but far higher
 * commercial value to us, because a seller creates supply, and supply is what
 * makes the buyer pages worth ranking in the first place.
 *
 * Content here is deliberately model-specific — who buys this car in Kenya,
 * what they ask, what moves the price. Generic pages spun per keyword are
 * doorway pages and get filtered; these have to earn the ranking.
 *
 * Deliberately no price figures: a stale or wrong number destroys trust with
 * the exact person we want to convert, and we have live listings that answer
 * the question better than a hardcoded range could.
 */

export type SellCarPage = {
  slug: string;
  /** Model as a seller would type it, e.g. "Toyota Premio" */
  model: string;
  /** Matching buyer page slug in search-intent-pages.ts, for cross-linking. */
  buyerSlug: string;
  /** One-line summary used in meta description and hero copy. */
  intro: string;
  /** Who actually buys this car in Kenya — the seller's audience. */
  buyerProfile: string;
  /** What drives this specific model's resale price. */
  priceFactors: string[];
  /** Questions buyers of this model ask first; answer them in the listing. */
  buyerQuestions: string[];
  /** Model-specific listing advice. */
  listingTips: string[];
  keywords: string[];
  related: string[];
};

export const sellCarPages = [
  {
    slug: "toyota-premio",
    model: "Toyota Premio",
    buyerSlug: "toyota-premio",
    intro:
      "The Premio is one of Kenya's most-searched saloons, so a well-presented listing rarely sits long. Price it against comparable years and grades, and be ready to answer questions about grade and import history.",
    buyerProfile:
      "Premio buyers are usually family or first-executive-car buyers who want comfort and low running costs without moving to an SUV. Many are upgrading from a Fielder or an Axio, so they compare your car directly against those, and they care more about condition and paperwork than about mileage alone.",
    priceFactors: [
      "Grade and trim — F, X and G-package cars sit at different prices even in the same year.",
      "Year and import date, since a later import of the same year often holds value better.",
      "Genuine mileage, backed by service records rather than the odometer alone.",
      "Accident and repair history, especially anything structural.",
      "Logbook status — a clean, in-your-name logbook removes the buyer's biggest worry.",
    ],
    buyerQuestions: [
      "Is the logbook ready and in your name?",
      "What grade is it, and is it a local unit or a recent import?",
      "Has it been in any accident, and is there a service history?",
      "Is the price negotiable, and can I bring my own mechanic?",
    ],
    listingTips: [
      "Put the year and grade in the title — \"Toyota Premio 2015 G-Package\" outranks a bare \"Toyota Premio\".",
      "Photograph the dashboard with the engine on so mileage and warning lights are both visible.",
      "Show the interior honestly, including seat wear — hiding it just wastes viewings.",
    ],
    keywords: [
      "sell my Toyota Premio",
      "sell Toyota Premio Kenya",
      "sell my Premio in Nairobi",
      "Toyota Premio resale value Kenya",
      "where to sell Toyota Premio",
    ],
    related: ["toyota-harrier", "mazda-atenza", "probox"],
  },
  {
    slug: "toyota-harrier",
    model: "Toyota Harrier",
    buyerSlug: "toyota-harrier",
    intro:
      "Harrier buyers in Kenya shop on condition and specification more than on price alone, so a detailed listing with strong photos does most of the negotiating for you.",
    buyerProfile:
      "Harrier buyers are typically stepping up into a premium SUV and are cross-shopping against the RAV4, the Vanguard and the Lexus RX. They tend to be less price-sensitive and more specification-sensitive — sunroof, leather, powered tailgate and 4WD all materially change what someone will pay.",
    priceFactors: [
      "Specification — sunroof, leather, JBL sound, powered tailgate and 360 camera each move the price.",
      "2WD versus 4WD, which matters to buyers outside the main towns.",
      "Engine option and fuel economy, since Harrier running costs are a common objection.",
      "Body and paint condition, because respray work is easy for a buyer to spot on this shape.",
      "Import year versus registration year, which buyers of this model check closely.",
    ],
    buyerQuestions: [
      "What is the exact specification — sunroof, leather, 4WD?",
      "What is the fuel consumption in town?",
      "Any respray, and has the body ever been welded?",
      "Is the logbook clean and ready for transfer?",
    ],
    listingTips: [
      "List the specification explicitly — buyers filter on it and will skip a vague listing.",
      "Shoot the exterior in daylight from all four corners; Harrier buyers judge on body condition.",
      "Include a short walkaround video — it converts far better than photos alone on this model.",
    ],
    keywords: [
      "sell my Toyota Harrier",
      "sell Toyota Harrier Kenya",
      "Toyota Harrier resale value Kenya",
      "where to sell Harrier Nairobi",
    ],
    related: ["toyota-premio", "mazda-atenza", "probox"],
  },
  {
    slug: "mazda-atenza",
    model: "Mazda Atenza",
    buyerSlug: "mazda-atenza",
    intro:
      "The Atenza attracts a smaller, more informed group of buyers than the Toyota saloons, so reaching the right audience matters more than pricing aggressively.",
    buyerProfile:
      "Atenza buyers are usually enthusiasts who have specifically chosen it over a Premio or an Allion for the styling, the diesel option and the drive. They know the model well, they will ask technical questions, and they are wary of the running costs — so honesty about service history sells this car faster than a low price does.",
    priceFactors: [
      "Petrol versus diesel — the diesel commands more but buyers will probe its service history hard.",
      "Service records, particularly for the diesel's injectors and DPF.",
      "Trim level and whether it is the saloon or the wagon.",
      "Tyre and suspension condition, which enthusiasts check first.",
      "Parts availability history — evidence you maintained it properly reassures the buyer.",
    ],
    buyerQuestions: [
      "Is it the petrol or the diesel, and what has been serviced recently?",
      "Any injector, DPF or turbo work done?",
      "Has it been well maintained, and do you have receipts?",
      "Why are you selling it?",
    ],
    listingTips: [
      "Say petrol or diesel in the title — it is the first thing an Atenza buyer filters on.",
      "Photograph your service receipts; on this model, documentation is the selling point.",
      "Write a longer description than you would for a Toyota — this buyer reads it all.",
    ],
    keywords: [
      "sell my Mazda Atenza",
      "sell Mazda Atenza Kenya",
      "Mazda Atenza resale value Kenya",
      "where to sell Mazda Atenza",
    ],
    related: ["toyota-premio", "toyota-harrier", "probox"],
  },
  {
    slug: "probox",
    model: "Toyota Probox",
    buyerSlug: "probox",
    intro:
      "The Probox sells as a working asset, not a lifestyle car. Buyers care about uptime and load capacity, so lead with what it can carry and how reliably it runs.",
    buyerProfile:
      "Probox buyers are overwhelmingly business buyers — traders, delivery operators, farm suppliers and matatu-adjacent operators — buying a tool that has to earn from day one. They will not pay for cosmetics, but they will pay for a car that starts every morning, and they buy fast when the condition is right.",
    priceFactors: [
      "Engine condition and how recently the timing chain and suspension were done.",
      "Whether it is the 1.3 or 1.5, and 2WD versus 4WD.",
      "Body condition where it matters — floor, boot and suspension mounts, not the paint.",
      "Working history, since a car used lightly commands more than an ex-delivery unit.",
      "Logbook and any outstanding financing, which business buyers check before viewing.",
    ],
    buyerQuestions: [
      "What has it been used for, and how hard?",
      "When were the suspension and timing chain last done?",
      "Is it the 1.5, and is it 2WD or 4WD?",
      "Can it be inspected by my mechanic before I pay?",
    ],
    listingTips: [
      "Lead with mechanical condition, not looks — this buyer is not paying for shine.",
      "Photograph the load area and the suspension; that is what gets inspected.",
      "State clearly what the car was used for. Business buyers respect a straight answer.",
    ],
    keywords: [
      "sell my Probox",
      "sell Toyota Probox Kenya",
      "Probox resale value Kenya",
      "where to sell Probox Nairobi",
    ],
    related: ["toyota-premio", "toyota-fielder", "isuzu-d-max"],
  },
  {
    slug: "toyota-vitz",
    model: "Toyota Vitz",
    buyerSlug: "toyota-vitz",
    intro:
      "The Vitz is the car most Kenyans buy first, so your audience is large but price-sensitive. A clean, honestly priced Vitz sells quickly; an optimistic one sits.",
    buyerProfile:
      "Vitz buyers are usually buying their first car, or a second small car for a household that already has one. They are budget-led and comparing several listings at once, often cross-shopping against the Passo, Demio and Note. Running costs matter more to them than specification, and many are nervous first-time buyers who will value a seller who explains things plainly over one who pushes.",
    priceFactors: [
      "Engine size — the 1.0 and the 1.3 sit at clearly different prices.",
      "Year and shape, since buyers recognise the generations and price them apart.",
      "Overall body condition, because this buyer cannot afford bodywork after buying.",
      "Service history and any recent major work, which reassures a first-time buyer.",
      "Logbook status — a pending transfer scares this buyer more than most.",
    ],
    buyerQuestions: [
      "Is it the 1.0 or the 1.3, and what is the fuel consumption?",
      "Has it been in any accident, and is there a service history?",
      "Is the logbook in your name and ready to transfer?",
      "What will it cost me to run and service?",
    ],
    listingTips: [
      "Put the engine size in the title — it is the first thing a Vitz buyer filters on.",
      "Answer the running-cost question in the description before it is asked.",
      "Be patient and plain in chat. Many of these buyers are buying their first car.",
    ],
    keywords: [
      "sell my Toyota Vitz",
      "sell Toyota Vitz Kenya",
      "Toyota Vitz resale value Kenya",
      "where to sell Vitz Nairobi",
    ],
    related: ["toyota-axio", "nissan-note", "toyota-premio"],
  },
  {
    slug: "toyota-axio",
    model: "Toyota Axio",
    buyerSlug: "toyota-axio",
    intro:
      "The Axio is one of the highest-turnover saloons in Kenya, which means a fair price sells fast and an ambitious one is immediately obvious to buyers.",
    buyerProfile:
      "Axio buyers want the cheapest sensible route into a reliable saloon, and most are commuters or small-business owners. They compare directly against the Vitz below and the Premio above, so your car is being judged on whether it justifies the step up or down. Hybrid variants attract a distinct, more informed buyer who will ask about battery condition specifically.",
    priceFactors: [
      "Hybrid versus petrol, and for hybrids, the state of the battery.",
      "Grade and trim level within the same model year.",
      "Genuine mileage supported by records rather than the odometer alone.",
      "Interior condition, which this buyer inspects closely for a car bought to commute in daily.",
      "Logbook status and whether any financing is outstanding.",
    ],
    buyerQuestions: [
      "Is it the hybrid, and if so how is the battery?",
      "What grade is it, and is it a local unit or an import?",
      "What is the genuine mileage, and do you have service records?",
      "Is the logbook ready for transfer?",
    ],
    listingTips: [
      "State hybrid or petrol in the title — it changes the buyer and the price bracket.",
      "For a hybrid, address battery health directly; silence on it reads as a problem.",
      "Photograph the interior properly. This car is bought to sit in every day.",
    ],
    keywords: [
      "sell my Toyota Axio",
      "sell Toyota Axio Kenya",
      "Toyota Axio resale value Kenya",
      "sell Axio hybrid Kenya",
    ],
    related: ["toyota-fielder", "toyota-vitz", "toyota-premio"],
  },
  {
    slug: "toyota-fielder",
    model: "Toyota Fielder",
    buyerSlug: "toyota-fielder",
    intro:
      "Fielder buyers are buying space, so lead with the load area and what the car can carry. Outside the main cities it is one of the easiest cars in Kenya to sell.",
    buyerProfile:
      "The Fielder sells to two groups at once: families who want a wagon rather than a saloon, and small traders who need to carry stock without running a pickup. That second group is why it moves so well upcountry. Both care about rear suspension condition, because a Fielder that has spent years carrying heavy loads shows it there first.",
    priceFactors: [
      "Hybrid versus petrol, and 2WD versus 4WD for upcountry buyers.",
      "Rear suspension condition, which reveals how hard the car has been loaded.",
      "Grade and trim, which buyers of this model do distinguish between.",
      "Body condition underneath, particularly for cars used on rough roads.",
      "Logbook status and any outstanding financing.",
    ],
    buyerQuestions: [
      "Is it the hybrid or petrol, and is it 2WD or 4WD?",
      "Has it been used to carry heavy loads, and how is the rear suspension?",
      "What is the service history, and has anything major been replaced?",
      "Is the logbook in your name?",
    ],
    listingTips: [
      "Photograph the load area with the seats down — it is the reason people buy this car.",
      "Be honest about load use. Traders will pay for a working car; they will not pay for a surprise.",
      "Mention 4WD if you have it. It matters a lot outside Nairobi and almost not at all inside it.",
    ],
    keywords: [
      "sell my Toyota Fielder",
      "sell Toyota Fielder Kenya",
      "Toyota Fielder resale value Kenya",
      "where to sell Fielder Kenya",
    ],
    related: ["toyota-axio", "probox", "toyota-premio"],
  },
  {
    slug: "nissan-note",
    model: "Nissan Note",
    buyerSlug: "nissan-note",
    intro:
      "The Note competes directly with the Vitz and Demio on price, so what sells it is reassurance about the gearbox. Address that in the listing and you will filter out most of the hesitation.",
    buyerProfile:
      "Note buyers are budget-focused first or second-car buyers who have usually looked at a Vitz or a Demio first and are considering the Note because it offers more space for the money. The recurring objection is the CVT gearbox — buyers have heard about it and will ask. A seller with servicing records and a straight answer converts far better than one who deflects.",
    priceFactors: [
      "Gearbox condition and any CVT servicing history, which dominates this model's resale.",
      "Standard versus the supercharged DIG-S engine.",
      "Year and shape, since the generations are priced quite differently.",
      "Body and interior condition, given the buyer's budget for repairs is limited.",
      "Logbook readiness and outstanding financing.",
    ],
    buyerQuestions: [
      "How does the CVT gearbox behave, and has it been serviced?",
      "Is it the standard engine or the DIG-S?",
      "What is the fuel consumption in town?",
      "Is the logbook in your name and ready to transfer?",
    ],
    listingTips: [
      "Address the gearbox in the description. It is the objection, so answer it before it is raised.",
      "Photograph any CVT or transmission service receipts you hold.",
      "Encourage a test drive. This model sells on the drive more than on the photos.",
    ],
    keywords: [
      "sell my Nissan Note",
      "sell Nissan Note Kenya",
      "Nissan Note resale value Kenya",
      "where to sell Nissan Note Nairobi",
    ],
    related: ["toyota-vitz", "toyota-axio", "toyota-premio"],
  },
  {
    slug: "subaru-forester",
    model: "Subaru Forester",
    buyerSlug: "subaru-forester",
    intro:
      "Forester buyers know the model and will ask technical questions. Documentation, not price, is what closes this sale — a well-serviced car commands a clear premium.",
    buyerProfile:
      "Forester buyers are usually enthusiasts or people who specifically need all-wheel drive, and they have chosen it deliberately over a RAV4 or an X-Trail. They know the engine's reputation, they know what neglect looks like, and they will ask about oil change intervals and head gaskets. They are wary of running costs, which means proof of maintenance is worth more to them than a lower asking price.",
    priceFactors: [
      "Turbo versus non-turbo, which separates two quite different buyer groups and price brackets.",
      "Documented servicing, especially oil change intervals — the single biggest value driver.",
      "Condition of the all-wheel-drive system and suspension.",
      "Any engine rebuild or head gasket work, and whether it is documented.",
      "Logbook status and outstanding financing.",
    ],
    buyerQuestions: [
      "Is it turbo or non-turbo, and what has been done to the engine?",
      "How regularly was the oil changed, and do you have receipts?",
      "Any head gasket or major engine work in its history?",
      "How is the suspension and the AWD system?",
    ],
    listingTips: [
      "Say turbo or non-turbo in the title — it is the first filter for this buyer.",
      "Photograph every service receipt you have. On this model, paperwork is the product.",
      "Write a longer description than you would for a Toyota. This buyer reads all of it.",
    ],
    keywords: [
      "sell my Subaru Forester",
      "sell Subaru Forester Kenya",
      "Subaru Forester resale value Kenya",
      "where to sell Subaru Kenya",
    ],
    related: ["toyota-harrier", "isuzu-d-max", "toyota-premio"],
  },
  {
    slug: "isuzu-d-max",
    model: "Isuzu D-Max",
    buyerSlug: "isuzu-d-max",
    intro:
      "A D-Max sells as equipment, not as a car. Buyers are businesses that need it working from day one, so lead with mechanical condition and what it has been used for.",
    buyerProfile:
      "D-Max buyers are overwhelmingly commercial — farmers, contractors, transporters and construction businesses — and they are buying capability. They will not pay for cosmetics, but they will pay well for a pickup with a sound chassis, healthy suspension and documented servicing. They almost always want their own mechanic to inspect it, and they buy decisively once satisfied.",
    priceFactors: [
      "2WD versus 4WD, and single versus double cab.",
      "Chassis and load-bed condition, including any welding or repair history.",
      "Suspension and clutch condition, given how these vehicles are used.",
      "Documented servicing and what the vehicle has been hauling.",
      "Logbook status and outstanding financing, which business buyers check before viewing.",
    ],
    buyerQuestions: [
      "Is it 2WD or 4WD, single or double cab?",
      "What has it been carrying, and how heavily?",
      "When were the suspension and clutch last done?",
      "Can my mechanic inspect it before I pay?",
    ],
    listingTips: [
      "Photograph the chassis, load bed and suspension. That is what gets inspected.",
      "State the work history plainly. Business buyers price honesty in; they punish surprises.",
      "Welcome an independent inspection in the listing itself — it signals confidence.",
    ],
    keywords: [
      "sell my Isuzu D-Max",
      "sell pickup Kenya",
      "sell double cab Kenya",
      "Isuzu D-Max resale value Kenya",
    ],
    related: ["toyota-hiace", "probox", "subaru-forester"],
  },
  {
    slug: "toyota-hiace",
    model: "Toyota Hiace",
    buyerSlug: "toyota-hiace",
    intro:
      "A Hiace is bought to earn, so buyers calculate payback rather than admire the vehicle. Be precise about route history, compliance and mechanical condition.",
    buyerProfile:
      "Hiace buyers are transport operators, matatu owners, tour operators and businesses moving staff or goods. They think in terms of daily revenue and downtime, so their questions are about engine condition, gearbox, suspension and how many days a month the vehicle has historically been off the road. PSV compliance and inspection status are decisive for anyone intending to operate it on a route.",
    priceFactors: [
      "Seating configuration and whether the vehicle is PSV-compliant.",
      "Engine and gearbox condition, and how recently major work was done.",
      "Suspension and body condition after route use.",
      "Current inspection certificate and licensing status.",
      "Logbook status and any outstanding financing, which matters more on commercial vehicles.",
    ],
    buyerQuestions: [
      "What routes has it worked, and for how long?",
      "Is it PSV-compliant, and is the inspection current?",
      "When were the engine, gearbox and suspension last worked on?",
      "Is the logbook clean, with no financing outstanding?",
    ],
    listingTips: [
      "State seating and PSV status in the title — operators filter on both.",
      "Give the route history honestly. Operators can read a vehicle's condition anyway.",
      "Photograph the seating, engine bay and suspension rather than styling the exterior.",
    ],
    keywords: [
      "sell my Toyota Hiace",
      "sell matatu Kenya",
      "sell van Kenya",
      "Toyota Hiace resale value Kenya",
    ],
    related: ["isuzu-d-max", "probox", "toyota-fielder"],
  },
] as const satisfies SellCarPage[];

/**
 * What a private seller needs for the NTSA transfer, shown on the national
 * and town pages. NTSA moved transfers from TIMS to eCitizen in January 2024
 * and replaced the paper logbook with the e-Logbook on 10 June 2026.
 */
export const SELLER_PAPERWORK = [
  "Logbook in your name (the e-Logbook in eCitizen, or the paper one), with no lender on it",
  "Your national ID and KRA PIN certificate",
  "An active eCitizen account, for the NTSA service portal",
  "A signed car sale agreement, with both parties' details",
  "The buyer's ID number and KRA PIN, which you enter to start the transfer",
  "Valid inspection certificate, where the class requires one",
] as const;

export function getSellCarPage(slug: string) {
  return sellCarPages.find((page) => page.slug === slug) ?? null;
}

export function sellCarPath(slug: string) {
  return `/sell/${slug}` as const;
}
