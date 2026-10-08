import { gql, type TypedDocumentNode } from "@apollo/client";
import type { ContentType } from "@/types/__generated__/graphql";

export type DiscoveryCategoryFacetsVars = {
  type?: ContentType;
  countyId?: string;
  subCountyId?: string;
  wardId?: string;
  minPrice?: number;
  maxPrice?: number;
  negotiableOnly?: boolean;
  specs?: { key: string; value: string }[];
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  postedWithinDays?: number;
};

export type CategoryFacet = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  count: number;
};

export type DiscoveryCategoriesData = {
  discoveryFacets: { categories: CategoryFacet[] };
};

// SideNav requests the unfiltered list; Explore supplies active narrowing
// filters so its category grid only offers categories with matching listings.
export const DISCOVERY_CATEGORIES: TypedDocumentNode<
  DiscoveryCategoriesData,
  DiscoveryCategoryFacetsVars
> = gql`
  query DiscoveryCategories(
    $type: ContentType
    $countyId: String
    $subCountyId: String
    $wardId: String
    $minPrice: Float
    $maxPrice: Float
    $negotiableOnly: Boolean
    $specs: [DiscoverySpecFilterInput!]
    $latitude: Float
    $longitude: Float
    $radiusKm: Float
    $postedWithinDays: Int
  ) {
    discoveryFacets(
      type: $type
      countyId: $countyId
      subCountyId: $subCountyId
      wardId: $wardId
      minPrice: $minPrice
      maxPrice: $maxPrice
      negotiableOnly: $negotiableOnly
      specs: $specs
      latitude: $latitude
      longitude: $longitude
      radiusKm: $radiusKm
      postedWithinDays: $postedWithinDays
    ) {
      categories {
        id
        name
        slug
        icon
        count
      }
    }
  }
`;
