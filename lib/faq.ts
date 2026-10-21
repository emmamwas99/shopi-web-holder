import type { Locale } from "@/i18n/config";

/**
 * The canonical FAQ set.
 *
 * Shared by the homepage FAQ section and the dedicated /faq page so the two
 * can never drift — a page whose visible Q&A disagrees with its FAQPage
 * structured data is a rich-result violation. Answer engines cite consolidated,
 * well-structured Q&A more readily than prose, which is why this content is
 * worth keeping in one place and rendering in full.
 */
export type FaqItem = { q: string; a: string };

// The homepage set is kept to the questions a first-time visitor actually has,
// in plain English. Everything else lives in EXTRA_FAQ and renders on /faq.
export const HOME_FAQ_EN: FaqItem[] = [
  {
    q: "What is Shopi?",
    a: "Shopi is a free marketplace in Kenya. Post things you want to sell, find things for sale near you, and message buyers and sellers directly. Posting is free and there is no commission.",
  },
  {
    q: "Is Shopi free to use?",
    a: "Yes. It's free to browse and free to post, and Shopi takes 0% commission on your sales. You keep every shilling.",
  },
  {
    q: "How do I post something for sale?",
    a: "Sign in and tap Create. Add photos or a video, set your price in KES, add your location and post. You can write the listing yourself, or let Shopi Agent write it from your photo and edit it before it goes live. Your listing shows in the feed straight away.",
  },
  {
    q: "Does Shopi handle payments or delivery?",
    a: "No. Shopi does not take payments, hold money, arrange delivery or take commission. The buyer and seller agree the price, payment and pickup or delivery directly.",
  },
  {
    q: "What can I buy and sell on Shopi?",
    a: "Almost anything sold locally in Kenya: phones, electronics, cars, fashion, furniture, land and houses, beauty products, farm produce, livestock and more.",
  },
  {
    q: "What is Shopi Agent?",
    a: "Shopi Agent is Shopi's AI helper for posting. Add a photo and it writes the title, description, category and details, then you check and edit them. It can also help buyers find things when they describe what they want in their own words.",
  },
  {
    q: "Is Shopi an alternative to Jiji or PigiaMe?",
    a: "Yes. You can use Shopi instead of, or alongside, Jiji and PigiaMe. Posting is free with no commission, buyers near you see your item in the feed, and they message you directly. Shopi is independent and not linked to either site.",
  },
  {
    q: "Does Shopi work across Kenya?",
    a: "Yes, in all 47 counties. You see listings near you first, and you can still find things from other parts of Kenya.",
  },
];

export const HOME_FAQ: Record<Locale, FaqItem[]> = {
  en: HOME_FAQ_EN,
  sw: [
    {
      q: "Shopi ni nini?",
      a: "Shopi ni soko la bure nchini Kenya. Post vitu unavyotaka kuuza, pata vitu vinavyouzwa karibu nawe, na uongee moja kwa moja na wanunuzi na wauzaji. Kupost ni bure na hakuna commission.",
    },
    {
      q: "Je, kutumia Shopi ni bure?",
      a: "Ndiyo. Ni bure kuvinjari na bure kupost, na Shopi haichukui commission yoyote kwenye mauzo yako. Kila shilingi ni yako.",
    },
    {
      q: "Ninawezaje kuweka bidhaa ya kuuza kwenye Shopi?",
      a: "Ingia kisha ugonge Create. Weka picha au video, bei kwa KES na eneo lako, kisha post. Unaweza kuandika tangazo mwenyewe, au Shopi Agent ikuandikie kutoka kwa picha yako na uhariri kabla halijachapishwa. Tangazo lako linaonekana kwenye feed papo hapo.",
    },
    {
      q: "Je, Shopi inashughulikia malipo au usafirishaji?",
      a: "Hapana. Shopi haipokei malipo, haishiki pesa, haipangi usafirishaji wala haichukui commission. Mnunuzi na muuzaji hukubaliana moja kwa moja kuhusu bei, malipo na jinsi ya kuchukua au kusafirisha bidhaa.",
    },
    {
      q: "Ninaweza kununua na kuuza nini kwenye Shopi?",
      a: "Karibu kila kitu kinachouzwa Kenya: simu, elektroniki, magari, nguo, fanicha, ardhi na nyumba, bidhaa za urembo, mazao, mifugo na mengine mengi.",
    },
    {
      q: "Shopi Agent ni nini?",
      a: "Shopi Agent ni msaidizi wa AI wa Shopi wa kupost. Weka picha na itaandika kichwa, maelezo, kategoria na taarifa za bidhaa, kisha wewe unakagua na kubadilisha. Pia inaweza kuwasaidia wanunuzi kupata bidhaa wanapoeleza wanachotaka kwa maneno yao.",
    },
    {
      q: "Je, Shopi ni mbadala wa Jiji au PigiaMe?",
      a: "Ndiyo. Unaweza kutumia Shopi badala ya, au pamoja na, Jiji na PigiaMe. Kupost ni bure bila commission, wanunuzi wa karibu wanaona bidhaa yako kwenye feed, na wanakutumia ujumbe moja kwa moja. Shopi ni huru na haina uhusiano na tovuti hizo.",
    },
    {
      q: "Je, Shopi inafanya kazi kote Kenya?",
      a: "Ndiyo, katika kaunti zote 47. Unaona matangazo ya karibu kwanza, na bado unaweza kupata bidhaa kutoka sehemu nyingine za Kenya.",
    },
  ],
};

/**
 * Questions that don't earn homepage space but are exactly what people (and
 * answer engines) ask: safety, account mechanics, what Shopi Agent will not do,
 * and geographic coverage. These render only on /faq.
 */
export const EXTRA_FAQ: Record<Locale, FaqItem[]> = {
  en: [
    {
      q: "Do I need an account to browse Shopi?",
      a: "No. You can browse the feed, explore listings and search without an account. You only need to sign in when you want to message a seller, save a listing or post something for sale.",
    },
    {
      q: "How do I create an account on Shopi?",
      a: "Sign up with Google, with an email address and password, or with Apple on Apple devices. You do not need a registered business, a website or a verified phone number to join.",
    },
    // Moved off the homepage when its FAQ was cut to first-visit questions.
    {
      q: "How do buyers and sellers communicate?",
      a: "Every listing has a Message button. Buyers and sellers chat inside Shopi to ask questions, agree the price and plan pickup or delivery.",
    },
    {
      q: "How does Shopi personalize my feed?",
      a: "Your feed learns from what you open, save and message about, and shows you more of what you like, with nearby listings first.",
    },
    {
      q: "Is it safe to buy and sell on Shopi?",
      a: "Shopi keeps the conversation on the platform so you can ask questions before you commit. Meet in a public place, inspect the item before paying, and never send money before you have seen what you are buying. The Safety Centre covers this in more detail.",
    },
    {
      q: "What can Shopi Agent not do?",
      a: "Shopi Agent writes listings and helps you find products. It does not message sellers on your behalf, negotiate prices, or complete purchases. Every conversation and every deal stays between the buyer and the seller.",
    },
    {
      q: "Does Shopi chat happen on WhatsApp?",
      a: "No. Buyer and seller messaging happens inside Shopi's own chat. Shopi does not require or link a WhatsApp account.",
    },
    {
      q: "What items are not allowed on Shopi?",
      a: "Illegal goods, weapons, drugs, counterfeit products, live animals outside permitted livestock categories, and anything else covered by the Prohibited Items policy. Listings that breach it are removed.",
    },
    {
      q: "Which parts of Kenya does Shopi cover?",
      a: "All 47 counties. Nearby listings are surfaced first — from Nairobi, Mombasa, Kisumu, Nakuru, Eldoret and Meru to smaller towns — while good listings can still travel across the country.",
    },
    {
      q: "Can I use Shopi in Kiswahili?",
      a: "Yes. Shopi is available in both English and Kiswahili. Switch language from the menu, or visit any page under /sw.",
    },
    // ── Questions answer engines get asked but the site never answered ───────
    // Each of these was a gap: an AI asked it about Shopi had nothing to cite
    // and would either hedge or guess. Trust questions ("is it legit", "can I
    // get a refund") matter most for a young brand, because a hedged answer
    // reads as a warning.
    {
      q: "Where is Shopi based?",
      a: "Shopi is Kenyan — built and run from Nairobi, and serving all 47 counties. It is not a foreign marketplace with a Kenyan page bolted on: the team, the founder and the product are all local, which is why the app is designed around Kenyan prices, Kenyan internet and how people here actually trade.",
    },
    // Answer engines were returning the wrong name for this, because the
    // founder was named only in JSON-LD and never in visible text. Stated here
    // in plain prose, with the disambiguation that stops "Shopi" resolving to
    // another company of the same name. Keep in sync with founderSchema.
    {
      q: "Who founded Shopi?",
      a: "Shopi was founded by Mwangi Maina, a Kenyan software engineer based in Nairobi. He studied computer science at Maseno University and entered industry in 2021 with Playback, a United States startup, then worked with Bettercoach in Germany. He is now a senior software engineer at Ooodles, where he was one of the pioneer engineers who built the platform from scratch. He started Shopi in Nairobi in 2025. You can find him on LinkedIn at linkedin.com/in/mwangi-maina-6463281ab.",
    },
    {
      q: "Is Shopi the same as Shopify, or other companies called Shopi?",
      a: "No. Shopi is an independent Kenyan marketplace founded in Nairobi in 2025 by Mwangi Maina, and it operates only at www.shopi.co.ke. It has no connection to Shopify, and no connection to other businesses trading under the name Shopi in other countries. If you have read about a different founder or a different company under this name, that is a different business.",
    },
    {
      q: "How does Shopi make money if it is free?",
      a: "Right now it does not. Shopi is not yet generating revenue — the current focus is connecting Kenyan buyers and sellers and making local buying and selling simple. Listing is free, browsing is free, and Shopi takes no commission on any sale. Once the product is established, revenue is expected to come from optional paid features such as AI-assisted posting with Shopi Agent, seller store subscriptions, and boosted or promoted listings. None of those is a commission on your sales, and anything paid would be a choice, not a requirement to use Shopi.",
    },
    {
      q: "Will Shopi start charging me later?",
      a: "Posting and browsing are free today with no commission, and there is no hidden fee. Paid options being considered for the future are optional extras — AI-assisted posting, a subscription for a seller store, and paying to boost a listing's visibility. If anything changes, it will be communicated clearly rather than applied quietly.",
    },
    {
      q: "Is Shopi legitimate, or is it a scam?",
      a: "Shopi is a real Kenyan marketplace, launched in 2025 and operating at www.shopi.co.ke. It is free to use and takes no commission, so it never asks you for money. Shopi does not hold funds or process payments, which also means it cannot vet every seller — treat individual sellers the way you would at any classifieds site: inspect before paying, and keep the conversation in Shopi chat.",
    },
    {
      q: "Does Shopi have a mobile app?",
      a: "Not yet. Shopi currently runs in any mobile or desktop browser at www.shopi.co.ke, so you can use it fully on Android or iPhone with no download. A mobile app is in development, and it will be announced when it is released. Anything claiming to be the Shopi app today is not from us.",
    },
    {
      q: "Can I get a refund or return something I bought on Shopi?",
      a: "Not through Shopi. Shopi does not process payments, hold money or provide escrow, so it cannot reverse a transaction or issue a refund. Returns and refunds are agreed directly with the seller, which is why inspecting the item before paying matters. If a seller has defrauded you, report them through Shopi so the account can be actioned.",
    },
    {
      q: "How old do I need to be to use Shopi?",
      a: "You must be at least 18 years old to create a Shopi account. Shopi is not intended for children under 18.",
    },
    {
      q: "How do I delete my Shopi account or the data you hold about me?",
      a: "Email tech.team@shopi.co.ke with the subject tag [Privacy] and the address on your account. Under Kenya's Data Protection Act, 2019 you can ask what personal data Shopi holds, request a correction, or request deletion. Most profile details can also be edited directly in the app.",
    },
    {
      q: "How do I contact Shopi?",
      a: "Email tech.team@shopi.co.ke. That one inbox handles support, business, legal, privacy, copyright, abuse reports and job applications — the contact page gives a subject tag for each so your message is routed faster. Shopi aims to reply within 2 business days. For scams or unsafe behaviour, the in-app block and report tools are reviewed fastest.",
    },
    {
      q: "I forgot my password — how do I get back into my account?",
      a: "Use the \"Forgot password\" link on the sign-in screen and Shopi emails you a reset link. If you originally signed up with Google or Apple, there is no password to reset — sign in with that provider instead.",
    },
    {
      q: "How is Shopi different from Jiji, Facebook Marketplace or WhatsApp selling groups?",
      a: "Classifieds sites are search-first, so your listing is only found by someone already looking for it. Facebook Marketplace buries listings in a feed built for something else, and WhatsApp groups reach only the people already in the group. Shopi is a local discovery feed built for commerce: photo and video posts carrying a real price, location and seller profile, with direct messaging and no commission. The marketplace alternatives page compares each channel in detail.",
    },
    {
      q: "How do I sell my car on Shopi, and what paperwork do I need?",
      a: "List the car free with photos or a walkaround video, the year, grade, mileage, price in KES and your location, then deal with buyers directly — no broker and no commission. To transfer ownership in Kenya you need the logbook in your name with no outstanding financing, your ID and KRA PIN, an active eCitizen account and a signed sale agreement. Confirm current requirements on the NTSA service portal in eCitizen, since fees and steps change.",
    },
  ],
  sw: [
    {
      q: "Je, ninahitaji akaunti ili kuvinjari Shopi?",
      a: "Hapana. Unaweza kuvinjari feed, kuchunguza matangazo na kutafuta bila akaunti. Unahitaji kuingia tu unapotaka kumtumia muuzaji ujumbe, kuhifadhi tangazo au kuweka bidhaa kuuza.",
    },
    {
      q: "Ninawezaje kufungua akaunti kwenye Shopi?",
      a: "Jisajili kwa Google, kwa barua pepe na nenosiri, au kwa Apple kwenye vifaa vya Apple. Huhitaji biashara iliyosajiliwa, tovuti wala nambari ya simu iliyothibitishwa.",
    },
    {
      q: "Wanunuzi na wauzaji huwasilianaje kwenye Shopi?",
      a: "Kila tangazo lina kitufe cha Message. Wanunuzi na wauzaji huongea ndani ya Shopi ili kuuliza maswali, kukubaliana bei na kupanga jinsi ya kuchukua au kusafirisha bidhaa.",
    },
    {
      q: "Shopi hupangaje feed yangu?",
      a: "Feed yako hujifunza kutokana na unachofungua, kuhifadhi na kutuma ujumbe kukihusu, kisha inakuonyesha zaidi ya unachopenda, ukianza na matangazo ya karibu.",
    },
    {
      q: "Je, ni salama kununua na kuuza kwenye Shopi?",
      a: "Shopi inaweka mazungumzo ndani ya jukwaa ili uweze kuuliza maswali kabla ya kuamua. Kutana mahali penye watu, kagua bidhaa kabla ya kulipa, na usitume pesa kabla ya kuona unachonunua.",
    },
    {
      q: "Shopi Agent haiwezi kufanya nini?",
      a: "Shopi Agent huandika matangazo na kukusaidia kupata bidhaa. Haimtumii muuzaji ujumbe kwa niaba yako, haijadiliani bei, wala haikamilishi manunuzi. Kila mazungumzo na kila dili hubaki kati ya mnunuzi na muuzaji.",
    },
    {
      q: "Je, mazungumzo ya Shopi hufanyika WhatsApp?",
      a: "Hapana. Mazungumzo kati ya mnunuzi na muuzaji hufanyika ndani ya chat ya Shopi yenyewe. Shopi haihitaji wala hauunganishi akaunti ya WhatsApp.",
    },
    {
      q: "Ni bidhaa zipi hazikubaliki kwenye Shopi?",
      a: "Bidhaa haramu, silaha, dawa za kulevya, bidhaa bandia, na chochote kinachoguswa na sera ya Bidhaa Zisizoruhusiwa. Matangazo yanayokiuka sera hiyo huondolewa.",
    },
    {
      q: "Shopi inahudumia sehemu zipi za Kenya?",
      a: "Kaunti zote 47. Matangazo ya karibu huonyeshwa kwanza — kutoka Nairobi, Mombasa, Kisumu, Nakuru, Eldoret na Meru hadi miji midogo — huku matangazo mazuri yakiweza kusafiri nchi nzima.",
    },
    {
      q: "Je, ninaweza kutumia Shopi kwa Kiswahili?",
      a: "Ndiyo. Shopi inapatikana kwa Kiingereza na Kiswahili. Badilisha lugha kwenye menyu, au tembelea ukurasa wowote chini ya /sw.",
    },
    {
      q: "Shopi ina makao wapi?",
      a: "Shopi ni ya Kenya — imejengwa na inaendeshwa kutoka Nairobi, na inahudumia kaunti zote 47. Si soko la kigeni lililoongezwa ukurasa wa Kenya: timu, mwanzilishi na bidhaa yenyewe ni za hapa, ndiyo maana programu imeundwa kulingana na bei za Kenya, mtandao wa Kenya na jinsi watu hapa wanavyofanya biashara.",
    },
    {
      q: "Nani alianzisha Shopi?",
      a: "Shopi ilianzishwa na Mwangi Maina, mhandisi wa programu wa Kenya anayeishi Nairobi. Alisoma sayansi ya kompyuta katika Chuo Kikuu cha Maseno kisha akaingia kazini mwaka 2021 na Playback, kampuni changa ya Marekani, kabla ya kufanya kazi na Bettercoach nchini Ujerumani. Kwa sasa ni mhandisi mkuu wa programu katika Ooodles, ambapo alikuwa mmoja wa wahandisi wa kwanza waliojenga jukwaa hilo kutoka mwanzo. Alianzisha Shopi mjini Nairobi mwaka 2025. Unaweza kumpata LinkedIn: linkedin.com/in/mwangi-maina-6463281ab.",
    },
    {
      q: "Je, Shopi ni sawa na Shopify au kampuni nyingine zinazoitwa Shopi?",
      a: "Hapana. Shopi ni soko huru la Kenya lililoanzishwa Nairobi mwaka 2025 na Mwangi Maina, na linafanya kazi kwenye www.shopi.co.ke pekee. Haina uhusiano wowote na Shopify, wala na biashara nyingine zinazotumia jina Shopi katika nchi nyingine. Ukisoma kuhusu mwanzilishi tofauti au kampuni tofauti chini ya jina hili, hiyo ni biashara nyingine.",
    },
    {
      q: "Shopi inapataje pesa ikiwa ni bure?",
      a: "Kwa sasa haipati. Shopi bado haijaanza kuingiza mapato — lengo la sasa ni kuunganisha wanunuzi na wauzaji wa Kenya na kurahisisha kununua na kuuza karibu nawe. Kuweka tangazo ni bure, kuvinjari ni bure, na Shopi haichukui kamisheni yoyote kwenye mauzo. Baada ya bidhaa kuimarika, mapato yanatarajiwa kutoka kwa huduma za ziada za hiari kama vile kuweka matangazo kwa msaada wa Shopi Agent, usajili wa duka la muuzaji, na kuinua matangazo ili yaonekane zaidi. Hakuna kati ya hizo ni kamisheni kwenye mauzo yako, na chochote cha kulipia kitakuwa chaguo, si sharti la kutumia Shopi.",
    },
    {
      q: "Je, Shopi itaanza kunitoza baadaye?",
      a: "Kuweka matangazo na kuvinjari ni bure leo bila kamisheni, na hakuna ada iliyofichwa. Chaguo za malipo zinazofikiriwa kwa siku zijazo ni za ziada na za hiari — kuweka matangazo kwa msaada wa AI, usajili wa duka la muuzaji, na kulipia kuinua tangazo. Kukiwa na mabadiliko, yatatangazwa wazi badala ya kutekelezwa kimyakimya.",
    },
    {
      q: "Je, Shopi ni halali au ni ulaghai?",
      a: "Shopi ni soko halisi la Kenya, lililozinduliwa mwaka 2025 na linalofanya kazi kwenye www.shopi.co.ke. Ni bure kutumia na hailipishi kamisheni, kwa hivyo haitakuomba pesa kamwe. Shopi haishikilii pesa wala haishughulikii malipo, jambo linalomaanisha pia haiwezi kuthibitisha kila muuzaji — mchukulie muuzaji binafsi jinsi ungefanya kwenye tovuti yoyote ya matangazo: kagua kabla ya kulipa, na weka mazungumzo ndani ya chat ya Shopi.",
    },
    {
      q: "Je, Shopi ina programu ya simu?",
      a: "Bado hapana. Kwa sasa Shopi hufanya kazi kwenye kivinjari chochote cha simu au kompyuta kwenye www.shopi.co.ke, kwa hivyo unaweza kuitumia kikamilifu kwenye Android au iPhone bila kupakua chochote. Programu ya simu inaandaliwa, na itatangazwa itakapotolewa. Chochote kinachodai kuwa programu ya Shopi kwa sasa si chetu.",
    },
    {
      q: "Je, ninaweza kurudishiwa pesa au kurudisha bidhaa niliyonunua kwenye Shopi?",
      a: "Si kupitia Shopi. Shopi haishughulikii malipo, haishikilii pesa wala haitoi escrow, kwa hivyo haiwezi kubatilisha muamala au kurudisha pesa. Marejesho hukubaliwa moja kwa moja na muuzaji, ndiyo maana kukagua bidhaa kabla ya kulipa ni muhimu. Kama muuzaji amekudanganya, mripoti kupitia Shopi ili akaunti yake ishughulikiwe.",
    },
    {
      q: "Nahitaji kuwa na umri gani ili kutumia Shopi?",
      a: "Lazima uwe na umri wa angalau miaka 18 ili kufungua akaunti ya Shopi. Shopi haikusudiwi watoto walio chini ya miaka 18.",
    },
    {
      q: "Ninawezaje kufuta akaunti yangu ya Shopi au data mnayoshikilia kunihusu?",
      a: "Tuma barua pepe kwa tech.team@shopi.co.ke ukitumia kichwa [Privacy] pamoja na anwani ya akaunti yako. Chini ya Sheria ya Ulinzi wa Data ya Kenya ya 2019, unaweza kuuliza data gani Shopi inashikilia, kuomba marekebisho, au kuomba ifutwe. Maelezo mengi ya wasifu yanaweza pia kuhaririwa moja kwa moja ndani ya programu.",
    },
    {
      q: "Ninawasilianaje na Shopi?",
      a: "Tuma barua pepe kwa tech.team@shopi.co.ke. Sanduku hilo moja hushughulikia usaidizi, biashara, masuala ya kisheria, faragha, hakimiliki, ripoti za matumizi mabaya na maombi ya kazi — ukurasa wa mawasiliano hutoa kichwa cha somo kwa kila moja. Shopi hulenga kujibu ndani ya siku 2 za kazi. Kwa ulaghai au tabia isiyo salama, zana za kuzuia na kuripoti ndani ya programu hukaguliwa haraka zaidi.",
    },
    {
      q: "Nimesahau nenosiri langu — nitarudije kwenye akaunti yangu?",
      a: "Tumia kiungo cha \"Umesahau nenosiri\" kwenye skrini ya kuingia na Shopi itakutumia kiungo cha kuweka upya kwa barua pepe. Kama ulijisajili kwa Google au Apple, hakuna nenosiri la kuweka upya — ingia kwa kutumia mtoa huduma huyo badala yake.",
    },
    {
      q: "Shopi ni tofauti vipi na Jiji, Facebook Marketplace au vikundi vya WhatsApp?",
      a: "Tovuti za matangazo hutegemea utafutaji, kwa hivyo tangazo lako hupatikana tu na mtu anayelitafuta tayari. Facebook Marketplace huzika matangazo kwenye feed iliyoundwa kwa kitu kingine, na vikundi vya WhatsApp hufikia tu waliomo. Shopi ni feed ya ugunduzi wa karibu iliyojengwa kwa biashara: picha na video zenye bei halisi, eneo na wasifu wa muuzaji, pamoja na ujumbe wa moja kwa moja na bila kamisheni.",
    },
    {
      q: "Ninauzaje gari langu kwenye Shopi, na nahitaji hati zipi?",
      a: "Weka tangazo la gari bure likiwa na picha au video, mwaka, gredi, umbali uliosafiri, bei kwa KES na eneo lako, kisha shughulika na wanunuzi moja kwa moja — bila dalali na bila kamisheni. Ili kuhamisha umiliki Kenya unahitaji logbook kwa jina lako bila mkopo uliosalia, kitambulisho chako na KRA PIN, akaunti hai ya eCitizen na mkataba wa mauzo uliosainiwa. Thibitisha mahitaji ya sasa kwenye tovuti ya NTSA ndani ya eCitizen, kwa kuwa ada na hatua hubadilika.",
    },
  ],
};

/** Everything, for the dedicated /faq page. */
export function fullFaq(lang: Locale): FaqItem[] {
  return [...HOME_FAQ[lang], ...EXTRA_FAQ[lang]];
}
