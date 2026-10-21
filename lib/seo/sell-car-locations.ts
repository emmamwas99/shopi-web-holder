/**
 * Location landing pages for car sellers.
 *
 * "Sell my car in Nairobi" is a materially different query from "sell my car in
 * Kenya", and the national hub at /sell-car-kenya cannot rank for both. Car
 * selling is also the most location-bound category on the marketplace: a buyer
 * will drive across a county to inspect a car, but almost never across the
 * country, so the town genuinely changes who sees the listing and what they pay.
 *
 * Each page has to earn its ranking. A template with the town name swapped in
 * is a doorway page and gets filtered, so every entry here carries facts that
 * are only true of that town — which models actually move there, who the buyers
 * are, where viewings happen, and where the nearest NTSA office is. Where a
 * claim would be the same everywhere, it lives on the national hub instead.
 *
 * Deliberately no price figures. A stale number destroys trust with the exact
 * person we are trying to convert, and live listings answer the question better
 * than a hardcoded range could.
 */

export type SellCarLocation = {
  slug: string;
  /** Town as a seller would type it, e.g. "Nairobi". */
  town: string;
  /** County the town sits in, for prose and cross-linking. */
  county: string;
  /** Matching county landing page slug in counties.ts, where one exists. */
  countySlug?: string;
  /** One-line summary used in the meta description and hero copy. */
  intro: string;
  /** What this specific market is like for someone selling a car. */
  marketNotes: string;
  /** Models that genuinely move in this town, and why. */
  popularModels: string[];
  /** Where sellers and buyers actually meet here. */
  viewingSpots: string[];
  /** Advice that is only true, or most true, in this town. */
  localTips: string[];
  /** Nearest NTSA service point for the transfer step. */
  ntsaNote: string;
  keywords: string[];
  /** Other location slugs to cross-link to. */
  related: string[];
};

export const sellCarLocations = [
  {
    slug: "nairobi",
    town: "Nairobi",
    county: "Nairobi",
    countySlug: "nairobi",
    intro:
      "Nairobi is the deepest car market in Kenya and the one where a good listing sells fastest. It is also the most competitive, so presentation and an honest price decide whether buyers message you or scroll past.",
    marketNotes:
      "More cars change hands in Nairobi than anywhere else in the country, which cuts both ways. Buyers are plentiful and many can view the same week, but they are also comparing your car against dozens of similar listings before they message anyone. Nairobi buyers are the most likely in Kenya to bring their own mechanic, to ask for the logbook before viewing, and to walk away over a vague answer about accident history. They are also the least tolerant of a price set above the visible market, because the comparison is one search away.",
    popularModels: [
      "Toyota Premio, Axio and Fielder — the default Nairobi commuter cars, and the fastest to sell when priced correctly.",
      "Toyota Vitz and Mazda Demio — first cars and second household cars, strong demand from younger buyers.",
      "Toyota Harrier, Nissan X-Trail and Subaru Forester — the estate and school-run SUVs, sold on specification more than price.",
      "Toyota Probox and Nissan NV200 — bought as working assets by traders and delivery operators, who buy fast when condition is right.",
    ],
    viewingSpots: [
      "Car bazaars along Ngong Road, Mombasa Road and Kiambu Road, where weekend foot traffic is highest.",
      "Petrol station forecourts on the buyer's side of town — safe, public, and neutral for both parties.",
      "Shopping mall car parks in Westlands, Karen, Kasarani and Embakasi, which work well for weekday evening viewings.",
    ],
    localTips: [
      "Say which side of town you are on in the listing. A buyer in Rongai will not cross to Kasarani on a weekday for a first viewing.",
      "Offer weekend viewing slots. Nairobi traffic kills weekday appointments and no-shows are common after 5pm.",
      "Expect an independent mechanic. Buyers here inspect more than anywhere else in Kenya — welcome it rather than resisting it.",
      "Be precise about grade and trim. With this many comparable listings, vagueness reads as something being hidden.",
    ],
    ntsaNote:
      "Transfer is done online on the NTSA service portal in eCitizen, so you do not need to travel for the transfer itself. Nairobi sellers who need in-person support have the widest choice of NTSA service points in the country, including Huduma Centres across the city.",
    keywords: [
      "sell my car in Nairobi",
      "sell car Nairobi",
      "where to sell my car in Nairobi",
      "sell car fast Nairobi",
      "sell car without broker Nairobi",
      "car buyers in Nairobi",
    ],
    related: ["kiambu", "machakos", "nakuru"],
  },
  {
    slug: "mombasa",
    town: "Mombasa",
    county: "Mombasa",
    countySlug: "mombasa",
    intro:
      "Mombasa buyers pay close attention to rust and body condition, because coastal salt air does real damage. A seller who documents the underbody honestly stands out immediately.",
    marketNotes:
      "The coast is a smaller market than Nairobi but a distinctive one. Sea air means corrosion is the first thing an experienced Mombasa buyer checks, and a car that has spent its life upcountry can actually command a premium here for exactly that reason — say so if it applies to yours. Proximity to the port also means buyers are more familiar with import paperwork than in most towns, so questions about import date, duty and registration history come up early and are worth answering in the listing itself.",
    popularModels: [
      "Toyota Premio, Axio and Fielder — the same commuter staples as upcountry, with condition weighted more heavily.",
      "Toyota Probox and pickups — heavily used by traders moving goods between Mombasa, Mtwapa and the hinterland.",
      "Toyota Hiace and matatu-class vans — strong demand along the Likoni and Mtwapa routes.",
      "Small hatchbacks such as the Vitz and Demio, popular for short urban trips in heavy island traffic.",
    ],
    viewingSpots: [
      "Nyali and Bamburi, which most buyers on the north coast will travel to without complaint.",
      "Changamwe and the mainland side, easier for buyers who would otherwise have to cross the Likoni ferry.",
      "Public forecourts near the main highway, so buyers from Mtwapa and Kilifi can reach you without entering town traffic.",
    ],
    localTips: [
      "Photograph the underbody, sills and door bottoms. Rust is the first question here, and pre-empting it builds immediate trust.",
      "Say whether the car has lived at the coast or upcountry. An upcountry car is a genuine selling point in Mombasa.",
      "State which side of the ferry you are on. Likoni crossing times decide whether a buyer bothers.",
      "If the car was imported recently, put the import and registration dates in the description — coastal buyers check them.",
    ],
    ntsaNote:
      "Transfer is completed online on the NTSA portal in eCitizen. Mombasa has NTSA service points and Huduma Centre support in the county for sellers who need help with an eCitizen account before the sale.",
    keywords: [
      "sell my car in Mombasa",
      "sell car Mombasa",
      "where to sell my car at the coast",
      "car buyers in Mombasa",
      "sell car Nyali Bamburi",
    ],
    related: ["nairobi", "nakuru", "kisumu"],
  },
  {
    slug: "nakuru",
    town: "Nakuru",
    county: "Nakuru",
    countySlug: "nakuru",
    intro:
      "Nakuru is one of Kenya's fastest-growing car markets, and demand skews towards cars that handle rural roads and carry loads. Ground clearance sells here in a way it does not in Nairobi.",
    marketNotes:
      "Nakuru sits at the centre of a large farming economy, and that shapes what sells. Buyers are frequently running a car on a mix of tarmac and rough farm roads, so suspension condition, ground clearance and 4WD matter more than they would in a city market. A saloon that has only ever driven on tarmac is worth saying so about. The town also serves a wide catchment — Naivasha, Gilgil, Molo and Njoro — so buyers travelling an hour for a viewing is normal, provided the listing is convincing enough to justify the trip.",
    popularModels: [
      "Toyota Probox and pickups such as the Isuzu D-Max — bought as working vehicles by farmers and traders.",
      "Subaru Forester and Toyota Land Cruiser variants — real demand for ground clearance and 4WD on farm roads.",
      "Toyota Fielder and Succeed — carry loads, survive rough roads, and hold value well in this market.",
      "Toyota Premio and Axio — the standard town commuter cars for Nakuru itself.",
    ],
    viewingSpots: [
      "Nakuru town centre, which is the natural meeting point for buyers from across the county.",
      "Petrol stations along the Nakuru–Naivasha highway, convenient for buyers travelling in from Gilgil or Naivasha.",
      "Public forecourts in Naivasha for buyers on the Nairobi side of the county.",
    ],
    localTips: [
      "Mention suspension work and ground clearance explicitly. Farm-road buyers ask about it before mileage.",
      "Say whether the car has been driven on rough roads or only on tarmac. Both answers sell, to different buyers.",
      "Name the surrounding towns you will meet in. Naivasha, Gilgil, Molo and Njoro buyers all read Nakuru listings.",
      "For pickups and Proboxes, lead with load capacity and mechanical condition rather than looks.",
    ],
    ntsaNote:
      "Transfer runs through the NTSA service portal on eCitizen. Nakuru has NTSA and Huduma Centre support in town for sellers who need to activate or recover an eCitizen account first.",
    keywords: [
      "sell my car in Nakuru",
      "sell car Nakuru",
      "car buyers in Nakuru",
      "sell my car Naivasha",
      "sell pickup Nakuru",
    ],
    related: ["nairobi", "eldoret", "nyeri"],
  },
  {
    slug: "eldoret",
    town: "Eldoret",
    county: "Uasin Gishu",
    countySlug: "uasin-gishu",
    intro:
      "Eldoret runs on agriculture, and the car market follows. Pickups, double cabs and high-clearance vehicles move faster here than saloons, and buyers judge on mechanical condition over cosmetics.",
    marketNotes:
      "Uasin Gishu is large-scale farming country, and the vehicles that sell reflect that: things that carry, tow and survive. Buyers here are often purchasing a working asset rather than a lifestyle car, which means they are unusually focused on engine condition, suspension, and what the vehicle has actually been used for. They ask direct questions and respect direct answers. Eldoret also serves a wide North Rift catchment, so buyers from Kitale, Iten and Kapsabet regularly travel in for a viewing.",
    popularModels: [
      "Isuzu D-Max, Toyota Hilux and other double cabs — the core of this market, bought to work.",
      "Toyota Probox and Succeed — used constantly for produce runs between farms and town.",
      "Toyota Land Cruiser and Prado — genuine demand, both for farm use and for rough North Rift roads.",
      "Toyota Fielder and Premio — the town commuter cars for Eldoret itself.",
    ],
    viewingSpots: [
      "Eldoret town centre, the natural meeting point for buyers travelling in from across the North Rift.",
      "Petrol station forecourts along the Eldoret–Kitale and Eldoret–Nakuru roads.",
      "Public car parks near the main commercial streets, easiest for weekday viewings.",
    ],
    localTips: [
      "Lead with mechanical condition and service history. This market pays for reliability, not for shine.",
      "State clearly what the vehicle was used for. Farm use is not a negative here if the maintenance was kept up.",
      "For pickups, photograph the load bed, suspension and tyres — those are what get inspected.",
      "Mention that you will meet buyers travelling from Kitale, Iten or Kapsabet. It widens your audience noticeably.",
    ],
    ntsaNote:
      "Transfer is done online on the NTSA portal in eCitizen. Eldoret has NTSA service and Huduma Centre support in Uasin Gishu for eCitizen account issues before a sale.",
    keywords: [
      "sell my car in Eldoret",
      "sell car Eldoret",
      "sell pickup Eldoret",
      "car buyers in Eldoret",
      "sell double cab Uasin Gishu",
    ],
    related: ["nakuru", "kisumu", "nairobi"],
  },
  {
    slug: "kisumu",
    town: "Kisumu",
    county: "Kisumu",
    countySlug: "kisumu",
    intro:
      "Kisumu is the commercial centre for the whole lake region, so a car listed here reaches buyers well beyond the town itself. Fuel economy and running costs come up early in every conversation.",
    marketNotes:
      "Kisumu serves a wide western catchment, and buyers frequently travel in from Kakamega, Siaya, Homa Bay and Bondo. That makes the audience larger than the town's size suggests, but it also means first viewings need to be worth a journey — a listing with a walkaround video converts noticeably better here than a photo-only one. Running costs dominate the conversation: buyers ask about fuel consumption and the cost of common repairs before they ask about extras, so a car with a documented service history and an economical engine has a clear advantage.",
    popularModels: [
      "Toyota Vitz, Passo and Mazda Demio — economical town cars, consistently the easiest sell.",
      "Toyota Probox and Succeed — used heavily by traders moving goods around the lake region.",
      "Toyota Premio and Axio — the standard family and commuter saloons.",
      "Toyota Fielder — favoured for carrying loads without moving to a pickup.",
    ],
    viewingSpots: [
      "Kisumu town centre and Milimani, easiest for buyers arriving from out of town.",
      "Petrol forecourts along the Kisumu–Kakamega and Kisumu–Kisii roads, for buyers travelling in.",
      "Mamboleo and the Kondele side, convenient for buyers on the northern approach.",
    ],
    localTips: [
      "Put fuel consumption in the description. It is the first question most Kisumu buyers ask.",
      "Post a walkaround video. Buyers travelling from Kakamega or Homa Bay need to be convinced before they set off.",
      "Name the surrounding towns you will deal with — your real audience is the whole lake region, not just Kisumu.",
      "Be specific about recent repairs and service. Documented maintenance carries real weight in this market.",
    ],
    ntsaNote:
      "Transfer runs through the NTSA service portal on eCitizen. Kisumu has NTSA and Huduma Centre support in the county for sellers who need to sort out an eCitizen account first.",
    keywords: [
      "sell my car in Kisumu",
      "sell car Kisumu",
      "car buyers in Kisumu",
      "sell my car western Kenya",
      "sell car Kakamega Kisumu",
    ],
    related: ["eldoret", "nakuru", "nairobi"],
  },
  {
    slug: "kiambu",
    town: "Thika and Kiambu",
    county: "Kiambu",
    countySlug: "kiambu",
    intro:
      "Kiambu is Nairobi's commuter belt, so you are selling into the Nairobi buyer pool without Nairobi's viewing logistics. For many sellers that is the best of both.",
    marketNotes:
      "Kiambu County — Thika, Ruiru, Juja, Kikuyu, Limuru and Kiambu town — is functionally part of the Nairobi market. Buyers here are largely Nairobi commuters, so demand looks like Nairobi demand: economical saloons and small SUVs, bought for a daily run into the city. The practical advantage over listing in Nairobi itself is that viewings are easier to arrange, since a buyer in Ruiru or Juja can meet you without crossing the city. The disadvantage is that some Nairobi buyers will not travel out, so saying plainly that you can meet along Thika Road widens your reach a lot.",
    popularModels: [
      "Toyota Axio, Premio and Fielder — the commuter default across the whole Thika Road corridor.",
      "Toyota Vitz and Mazda Demio — first cars, and second cars for households already running one.",
      "Nissan X-Trail and Toyota Rush — small SUVs bought for the school run and weekend trips.",
      "Toyota Probox — used constantly by traders around Thika, Ruiru and the Kiambu farms.",
    ],
    viewingSpots: [
      "Petrol forecourts and mall car parks along Thika Superhighway, reachable from both Nairobi and Thika.",
      "Ruiru and Juja, which are the natural halfway points for a Nairobi buyer.",
      "Thika town centre for buyers from the upper end of the county and Murang'a side.",
    ],
    localTips: [
      "Offer to meet along Thika Road. It converts Nairobi buyers who would otherwise skip an out-of-town listing.",
      "Name your specific town — Ruiru, Juja, Thika, Kikuyu and Limuru are very different journeys for a buyer.",
      "Price against Nairobi listings, not against a smaller upcountry market. Your buyers are comparing with Nairobi.",
      "Weekend viewings work far better than weekday ones, because most buyers here commute into the city.",
    ],
    ntsaNote:
      "Transfer is completed online on the NTSA portal in eCitizen. Kiambu County has Huduma Centre support, and Nairobi's NTSA service points are within easy reach if in-person help is needed.",
    keywords: [
      "sell my car in Thika",
      "sell my car in Kiambu",
      "sell car Ruiru Juja",
      "car buyers Thika Road",
      "sell car Kiambu county",
    ],
    related: ["nairobi", "nyeri", "machakos"],
  },
  {
    slug: "nyeri",
    town: "Nyeri",
    county: "Nyeri",
    countySlug: "nyeri",
    intro:
      "Nyeri and the wider Mt Kenya region buy carefully and keep cars long. Service history and honest condition matter more here than a keen price.",
    marketNotes:
      "Central Kenya buyers have a reputation for due diligence, and it is earned. Cars are bought to be kept, so buyers ask about service records, previous ownership and repair history in more detail than in most markets, and they are comfortable walking away from a car whose history is unclear. The flip side is that a well-documented car with a clean logbook sells at a strong price and without much haggling. Nyeri also serves buyers from Karatina, Othaya, Mukurweini and the Mt Kenya region generally, and the roads mean ground clearance has real value.",
    popularModels: [
      "Toyota Probox, Succeed and Fielder — used for produce and trade throughout the region.",
      "Subaru Forester and Toyota Rush — bought for the hillier roads around the Aberdares and Mt Kenya.",
      "Toyota Premio and Axio — the town and family saloons.",
      "Pickups and double cabs — steady demand from farming and construction buyers.",
    ],
    viewingSpots: [
      "Nyeri town centre, the natural meeting point for the county.",
      "Karatina, convenient for buyers from the Mathira and Kirinyaga side.",
      "Petrol forecourts along the Nyeri–Nairobi highway for buyers travelling in.",
    ],
    localTips: [
      "Photograph your service records. Documentation is the strongest selling point in this market.",
      "Be precise about previous ownership and any accident history. Vagueness costs you the sale here, not just the price.",
      "Mention ground clearance and suspension condition — the roads around the region make it a real consideration.",
      "Expect fewer but more serious enquiries than in Nairobi. Answer each one properly.",
    ],
    ntsaNote:
      "Transfer is completed online on the NTSA service portal in eCitizen. Nyeri has Huduma Centre support in town for sellers who need help with an eCitizen account before selling.",
    keywords: [
      "sell my car in Nyeri",
      "sell car Nyeri",
      "car buyers in Nyeri",
      "sell my car central Kenya",
      "sell car Karatina",
    ],
    related: ["kiambu", "nakuru", "meru"],
  },
  {
    slug: "meru",
    town: "Meru",
    county: "Meru",
    countySlug: "meru",
    intro:
      "Meru's car market is driven by farming and trade, so load-carrying and reliability sell far better than specification. Buyers travel in from across the county for the right vehicle.",
    marketNotes:
      "Meru runs on miraa, tea, dairy and produce trade, and the vehicles that hold value are the ones that support it. Probox-class vehicles and pickups are bought as working assets and are expected to earn immediately, which makes buyers focused on engine condition, suspension and how hard the vehicle has been used. Roads across the county vary a lot, so ground clearance matters. The catchment is wide — buyers come in from Maua, Nkubu, Timau and Chuka — and a clear listing with video saves both sides a wasted journey.",
    popularModels: [
      "Toyota Probox and Succeed — the workhorses of the produce and miraa trade.",
      "Pickups and double cabs such as the Isuzu D-Max and Toyota Hilux — farm and construction demand.",
      "Toyota Fielder — carries loads without the running costs of a pickup.",
      "Subaru Forester and Toyota Rush — bought for the rougher roads across the county.",
    ],
    viewingSpots: [
      "Meru town centre, the main meeting point for buyers across the county.",
      "Nkubu and Maua for buyers on the southern and northern sides respectively.",
      "Petrol forecourts along the Meru–Nanyuki and Meru–Embu roads.",
    ],
    localTips: [
      "Lead with mechanical condition and recent service work. This is a working-vehicle market.",
      "State what the vehicle has been used for and how hard. Buyers here prefer a straight answer to a flattering one.",
      "Post a video. With buyers travelling in from Maua, Timau or Chuka, a video prevents wasted trips.",
      "For pickups and Proboxes, photograph the load area, suspension and tyres — that is what gets checked.",
    ],
    ntsaNote:
      "Transfer runs online on the NTSA service portal in eCitizen. Meru has Huduma Centre support in town for sellers who need to activate an eCitizen account first.",
    keywords: [
      "sell my car in Meru",
      "sell car Meru",
      "car buyers in Meru",
      "sell pickup Meru",
      "sell my Probox Meru",
    ],
    related: ["nyeri", "nakuru", "eldoret"],
  },
  {
    slug: "machakos",
    town: "Machakos and Athi River",
    county: "Machakos",
    intro:
      "Machakos County sits on Nairobi's southern edge, so you reach Nairobi buyers along Mombasa Road while keeping viewings simple. Commercial vehicles move particularly well here.",
    marketNotes:
      "Machakos, Athi River, Mlolongo and Syokimau form a corridor that is commercially part of Nairobi, with heavy transport and logistics activity along Mombasa Road. That gives the market an unusual mix: ordinary commuter saloons bought by people working in Nairobi, and a steady trade in pickups, vans and light commercial vehicles bought by businesses along the corridor. Because Mombasa Road is the artery, saying you can meet along it is the single most useful line you can put in a Machakos listing.",
    popularModels: [
      "Toyota Probox, Hiace and light commercial vans — strong demand from the logistics corridor.",
      "Pickups and double cabs — bought by construction and transport businesses around Athi River.",
      "Toyota Axio, Premio and Fielder — the commuter cars for people working in Nairobi.",
      "Toyota Vitz and Mazda Demio — economical second cars for households along the corridor.",
    ],
    viewingSpots: [
      "Petrol forecourts along Mombasa Road at Mlolongo, Athi River and Syokimau.",
      "Machakos town centre for buyers from the wider county.",
      "Mall car parks along the Nairobi approach, easiest for buyers coming out of the city.",
    ],
    localTips: [
      "Say you can meet along Mombasa Road. It is the difference between a local audience and a Nairobi one.",
      "For commercial vehicles, lead with load capacity, service history and what the vehicle has been used for.",
      "Name your town — Machakos, Athi River, Mlolongo and Syokimau are very different journeys for a buyer.",
      "Price against Nairobi listings. Your buyers are comparing against the city, not against a smaller market.",
    ],
    ntsaNote:
      "Transfer is completed online on the NTSA portal in eCitizen. Machakos County has Huduma Centre support, and Nairobi's NTSA service points are close by along Mombasa Road.",
    keywords: [
      "sell my car in Machakos",
      "sell car Athi River",
      "sell car Mlolongo Syokimau",
      "car buyers Mombasa Road",
      "sell van Machakos",
    ],
    related: ["nairobi", "kiambu", "mombasa"],
  },
] as const satisfies readonly SellCarLocation[];

export type SellCarLocationData = (typeof sellCarLocations)[number];

export function getSellCarLocation(slug: string): SellCarLocationData | null {
  return sellCarLocations.find((location) => location.slug === slug) ?? null;
}

export function sellCarLocationPath(slug: string) {
  return `/sell-car-kenya/${slug}` as const;
}
