import { gql, type TypedDocumentNode } from "@apollo/client";

/**
 * Shop verification, as the seller sees it. Hand-typed (like the dashboard's
 * queries) so the screen doesn't wait on a codegen run against a live API.
 * Enum values are the API's wire keys.
 */

export type ShopVerificationStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
export type ShopVerificationRequirement = "BUSINESS_NAME" | "PERMIT" | "SHOP_PHOTO" | "LOCATION";
export type ShopVerificationDocumentKind = "PERMIT" | "SHOP_PHOTO";

export interface ShopVerificationGuidanceFile {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url: string;
  urlExpiresAt: string;
}

export interface ShopVerificationDocument {
  kind: ShopVerificationDocumentKind;
  fileName?: string | null;
  contentType: string;
  isPdf: boolean;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  uploadedAt: string;
  url: string;
  urlExpiresAt: string;
}

export interface ShopVerificationLocation {
  county?: string | null;
  subregion?: string | null;
  wardName?: string | null;
  placeName?: string | null;
  formattedAddress?: string | null;
  placeId?: string | null;
  addressLine?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ShopVerificationIssueDetail {
  issue: string;
  title: string;
  detail: string;
  requirement?: ShopVerificationRequirement | null;
}

export interface ShopVerification {
  id: string;
  status: ShopVerificationStatus;
  businessName?: string | null;
  location?: ShopVerificationLocation | null;
  permit?: ShopVerificationDocument | null;
  shopPhoto?: ShopVerificationDocument | null;
  missing: ShopVerificationRequirement[];
  canEdit: boolean;
  submittedAt?: string | null;
  submissionCount: number;
  reviewedAt?: string | null;
  issues: ShopVerificationIssueDetail[];
  decisionNote?: string | null;
  guidanceFiles: ShopVerificationGuidanceFile[];
  verifiedAt?: string | null;
  revokedAt?: string | null;
  updatedAt: string;
}

export interface MyShopVerification {
  isVerified: boolean;
  application?: ShopVerification | null;
  suggestedLocation?: ShopVerificationLocation | null;
  suggestedLocationSource?: "LATEST_LISTING" | "PROFILE" | null;
}

/** What an autosave sends: any field left out is left as it is. */
export interface SaveShopVerificationInput {
  businessName?: string | null;
  location?: ShopVerificationLocationInput | null;
}

export interface ShopVerificationLocationInput {
  county?: string | null;
  subregion?: string | null;
  placeName?: string | null;
  formattedAddress?: string | null;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addressLine?: string | null;
}

const LOCATION_FIELDS = gql`
  fragment ShopVerificationLocationFields on ShopVerificationLocation {
    county
    subregion
    wardName
    placeName
    formattedAddress
    placeId
    addressLine
    latitude
    longitude
  }
`;

const DOCUMENT_FIELDS = gql`
  fragment ShopVerificationDocumentFields on ShopVerificationDocument {
    kind
    fileName
    contentType
    isPdf
    sizeBytes
    width
    height
    uploadedAt
    url
    urlExpiresAt
  }
`;

export const SHOP_VERIFICATION_FIELDS = gql`
  fragment ShopVerificationFields on ShopVerification {
    id
    status
    businessName
    location {
      ...ShopVerificationLocationFields
    }
    permit {
      ...ShopVerificationDocumentFields
    }
    shopPhoto {
      ...ShopVerificationDocumentFields
    }
    missing
    canEdit
    submittedAt
    submissionCount
    reviewedAt
    issues {
      issue
      title
      detail
      requirement
    }
    decisionNote
    guidanceFiles {
      fileName
      contentType
      sizeBytes
      url
      urlExpiresAt
    }
    verifiedAt
    revokedAt
    updatedAt
  }
  ${LOCATION_FIELDS}
  ${DOCUMENT_FIELDS}
`;

export const MY_SHOP_VERIFICATION = gql`
  query MyShopVerification {
    myShopVerification {
      isVerified
      suggestedLocationSource
      suggestedLocation {
        ...ShopVerificationLocationFields
      }
      application {
        ...ShopVerificationFields
      }
    }
  }
  ${SHOP_VERIFICATION_FIELDS}
` as TypedDocumentNode<{ myShopVerification: MyShopVerification }, Record<string, never>>;

export const SAVE_SHOP_VERIFICATION_DRAFT = gql`
  mutation SaveShopVerificationDraft($input: SaveShopVerificationInput!) {
    saveShopVerificationDraft(input: $input) {
      ...ShopVerificationFields
    }
  }
  ${SHOP_VERIFICATION_FIELDS}
` as TypedDocumentNode<
  { saveShopVerificationDraft: ShopVerification },
  { input: SaveShopVerificationInput }
>;

export const REMOVE_SHOP_VERIFICATION_DOCUMENT = gql`
  mutation RemoveShopVerificationDocument($kind: ShopVerificationDocumentKind!) {
    removeShopVerificationDocument(kind: $kind) {
      ...ShopVerificationFields
    }
  }
  ${SHOP_VERIFICATION_FIELDS}
` as TypedDocumentNode<
  { removeShopVerificationDocument: ShopVerification },
  { kind: ShopVerificationDocumentKind }
>;

export const SUBMIT_SHOP_VERIFICATION = gql`
  mutation SubmitShopVerification($input: SubmitShopVerificationInput!) {
    submitShopVerification(input: $input) {
      ...ShopVerificationFields
    }
  }
  ${SHOP_VERIFICATION_FIELDS}
` as TypedDocumentNode<
  { submitShopVerification: ShopVerification },
  { input: { businessName: string; location: ShopVerificationLocationInput; confirmed: boolean } }
>;

export const WITHDRAW_SHOP_VERIFICATION = gql`
  mutation WithdrawShopVerification {
    withdrawShopVerification {
      ...ShopVerificationFields
    }
  }
  ${SHOP_VERIFICATION_FIELDS}
` as TypedDocumentNode<{ withdrawShopVerification: ShopVerification }, Record<string, never>>;
