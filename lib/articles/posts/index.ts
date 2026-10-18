import type { Article } from "../types.ts";
import { article as bedsittersForRentInNairobi } from "./bedsitters-for-rent-in-nairobi.ts";
import { article as dropshippingInKenya } from "./dropshipping-in-kenya.ts";
import { article as howToCheckAUsedCar } from "./how-to-check-a-used-car-before-buying-in-kenya.ts";
import { article as makeMoneyOnline } from "./how-to-make-money-online-in-kenya-without-investment.ts";
import { article as iphone13Price } from "./iphone-13-price-in-kenya.ts";
import { article as phonesUnder20000 } from "./phones-under-20000-in-kenya.ts";
import { article as ps5Price } from "./ps5-price-in-kenya.ts";
import { article as referAndEarn } from "./refer-and-earn-in-kenya.ts";
import { article as sofaPrices } from "./sofa-prices-in-kenya.ts";
import { article as toyotaVitzPrice } from "./toyota-vitz-price-in-kenya.ts";

/**
 * Every article, one file each. To publish a new one: copy the closest
 * existing article of the same intent, rewrite it for the new query, add it
 * here, and run `npm run seo:audit`.
 */
export const POSTS: Article[] = [
  toyotaVitzPrice,
  howToCheckAUsedCar,
  iphone13Price,
  phonesUnder20000,
  bedsittersForRentInNairobi,
  ps5Price,
  sofaPrices,
  makeMoneyOnline,
  referAndEarn,
  dropshippingInKenya,
];
