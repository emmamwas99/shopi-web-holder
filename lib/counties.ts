/**
 * The counties that get their own landing page.
 *
 * Local intent ("… for sale in Nakuru") is the strongest commercial query
 * pattern in this market and siteConfig.keywords already targets it, but the
 * site had no page to rank for any of it. This is deliberately a curated
 * shortlist rather than all 47: a page per county with no inventory behind it
 * is thin content, which costs more than the coverage is worth. Add a county
 * here once it has listings to show.
 *
 * `name` must match the county string the API stores on listings — it is used
 * verbatim as the `county` filter argument.
 */
export type County = {
  slug: string;
  /** County value as stored on listings; used as the API filter. */
  name: string;
  /** How the county is referred to in prose. */
  label: string;
  towns: string[];
  blurb: string;
};

export const COUNTIES: County[] = [
  {
    slug: "nairobi",
    name: "Nairobi",
    label: "Nairobi",
    towns: ["Westlands", "Kasarani", "Embakasi", "Karen", "Rongai", "CBD"],
    blurb:
      "Kenya's largest marketplace by volume. Phones, electronics, furniture, fashion and cars move fastest here, and most sellers can meet the same day across town.",
  },
  {
    slug: "mombasa",
    name: "Mombasa",
    label: "Mombasa",
    towns: ["Nyali", "Bamburi", "Likoni", "Changamwe", "Mtwapa"],
    blurb:
      "Coast listings from Nyali to Likoni — household items, electronics, fashion and vehicles, with sellers you can meet without crossing the country.",
  },
  {
    slug: "kisumu",
    name: "Kisumu",
    label: "Kisumu",
    towns: ["Milimani", "Kondele", "Mamboleo", "Nyalenda"],
    blurb:
      "Lakeside buying and selling — furniture, phones, farm produce and fish trade equipment from sellers around Kisumu town and the wider county.",
  },
  {
    slug: "nakuru",
    name: "Nakuru",
    label: "Nakuru",
    towns: ["Nakuru Town", "Naivasha", "Gilgil", "Molo", "Njoro"],
    blurb:
      "One of Kenya's fastest-growing markets. Farm inputs, livestock, land and vehicles alongside the usual phones and household goods.",
  },
  {
    slug: "nyandarua",
    name: "Nyandarua",
    label: "Nyandarua",
    towns: ["Ol Kalou", "Njabini", "Engineer", "Ndaragwa"],
    blurb:
      "Strong farm-produce and land activity — potatoes, dairy, plots and farm equipment, plus everyday household and electronics listings.",
  },
  {
    slug: "meru",
    name: "Meru",
    label: "Meru",
    towns: ["Meru Town", "Maua", "Nkubu", "Timau"],
    blurb:
      "Miraa country and a busy agricultural market — produce, livestock, land and farm equipment alongside phones, furniture and vehicles.",
  },
  {
    slug: "nyeri",
    name: "Nyeri",
    label: "Nyeri",
    towns: ["Nyeri Town", "Karatina", "Othaya", "Mweiga"],
    blurb:
      "Central Kenya trade — coffee and dairy country, with land, farm produce, household goods and vehicles listed by nearby sellers.",
  },
  {
    slug: "kiambu",
    name: "Kiambu",
    label: "Kiambu",
    towns: ["Thika", "Ruiru", "Kikuyu", "Limuru", "Juja"],
    blurb:
      "Nairobi's neighbour and one of the busiest property markets in the country — plots and houses alongside furniture, electronics and cars.",
  },
  {
    slug: "uasin-gishu",
    name: "Uasin Gishu",
    label: "Uasin Gishu (Eldoret)",
    towns: ["Eldoret", "Turbo", "Ziwa", "Moiben"],
    blurb:
      "Eldoret and the North Rift — maize and dairy farming drives produce and equipment listings, with a steady market in vehicles and electronics.",
  },
  {
    slug: "laikipia",
    name: "Laikipia",
    label: "Laikipia",
    towns: ["Nanyuki", "Nyahururu", "Rumuruti"],
    blurb:
      "Nanyuki and Nyahururu — ranching and farming country with active land, livestock and vehicle listings from local sellers.",
  },
];

export function getCounty(slug: string): County | undefined {
  return COUNTIES.find((c) => c.slug === slug);
}

/** The landing page for a listing's county, if it has one. */
export function getCountyByName(name: string): County | undefined {
  const wanted = name.trim().toLowerCase();
  return COUNTIES.find((c) => c.name.toLowerCase() === wanted);
}
