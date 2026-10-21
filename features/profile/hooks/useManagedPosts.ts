"use client";

import { gql, type TypedDocumentNode } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";

export type ManagedPostStatus =
  | "ACTIVE"
  | "UNDER_REVIEW"
  | "REMOVED"
  | "DRAFT"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "PROCESSING"
  | "FAILED";

export type ManagedPostVisibility = "PUBLIC" | "COMMUNITY_ONLY" | "PRIVATE";
export type ManagedPostType = "VIDEO" | "IMAGE";

export type ManagedPost = {
  id: string;
  slug?: string | null;
  /** Seller-facing listing number, e.g. SH-EL-00012. */
  listingNumber?: string | null;
  type: ManagedPostType;
  title: string;
  caption?: string | null;
  createdAt: string;
  updatedAt: string;
  categoryId?: string | null;
  /** Only on the list and detail queries — see MY_MANAGED_CONTENT. */
  category?: { id: string; name: string } | null;
  aiClassification?: { level2?: string | null } | null;
  visibility: ManagedPostVisibility;
  status: ManagedPostStatus;
  isLive: boolean;
  processingError?: string | null;
  price: {
    amount: number;
    currency: string;
    negotiable: boolean;
  };
  location?: {
    county?: string | null;
    subregion?: string | null;
    placeName?: string | null;
  } | null;
  approval?: {
    isApproved: boolean;
    rejectionReason?: string | null;
    approvedAt?: string | null;
    rejectedAt?: string | null;
  } | null;
  stats: {
    views: number;
    likes: number;
    saves: number;
    shares: number;
    comments: number;
  };
  media: Array<{
    mediaType: ManagedPostType;
    thumbnailUrl?: string | null;
    url?: string | null;
    sortOrder: number;
    muxMeta?: {
      playbackId?: string | null;
      thumbnailUrl?: string | null;
      aspectRatio?: string | null;
    } | null;
    r2Variants?: Array<{
      variant: string;
      url: string;
      width: number;
      height: number;
    }> | null;
  }>;
};

type ManagedContentConnection = {
  myManagedContent: {
    items: ManagedPost[];
    hasMore: boolean;
    nextCursor?: string | null;
  };
};

type ManagedContentVariables = {
  limit?: number;
  afterId?: string;
};

type ManagedContentDetailData = {
  myManagedContentDetail: ManagedPost | null;
};

type ManagedContentDetailVariables = {
  contentId: string;
};

type UpdateOwnedContentVariables = {
  contentId: string;
  input: {
    title?: string;
    caption?: string;
    categoryId?: string | null;
    subcategory?: string | null;
    price?: {
      amount: number;
      currency?: string;
      negotiable?: boolean;
    };
  };
};

type UpdateOwnedContentMediaVariables = {
  contentId: string;
  /** The post's new media in order: each keeps an item (its index in the
   *  post's current `media`) or attaches a just-uploaded MediaAsset. */
  items: Array<{ keepIndex: number } | { mediaAssetId: string }>;
};

type SetOwnedContentHiddenVariables = {
  contentId: string;
  hidden: boolean;
};

type DeleteContentVariables = {
  contentId: string;
};

const MANAGED_POST_FIELDS = gql`
  fragment ManagedPostFields on Content {
    id
    slug
    listingNumber
    type
    title
    caption
    createdAt
    updatedAt
    categoryId
    aiClassification {
      level2
    }
    visibility
    status
    isLive
    processingError
    price {
      amount
      currency
      negotiable
    }
    location {
      county
      subregion
      placeName
    }
    approval {
      isApproved
      rejectionReason
      approvedAt
      rejectedAt
    }
    stats {
      views
      likes
      saves
      shares
      comments
    }
    media {
      mediaType
      thumbnailUrl
      url
      sortOrder
      muxMeta {
        playbackId
        thumbnailUrl
        aspectRatio
      }
      r2Variants {
        variant
        url
        width
        height
      }
    }
  }
`;

export const MY_MANAGED_CONTENT: TypedDocumentNode<
  ManagedContentConnection,
  ManagedContentVariables
> = gql`
  query MyManagedContent($limit: Int, $afterId: String) {
    myManagedContent(limit: $limit, afterId: $afterId) {
      hasMore
      nextCursor
      items {
        ...ManagedPostFields
        # Here, not in the fragment: the edit and hide mutations return the
        # fragment but don't resolve the category, and a null there would
        # overwrite the cached name.
        category {
          id
          name
        }
      }
    }
  }
  ${MANAGED_POST_FIELDS}
`;

export const MY_MANAGED_CONTENT_DETAIL: TypedDocumentNode<
  ManagedContentDetailData,
  ManagedContentDetailVariables
> = gql`
  query MyManagedContentDetail($contentId: String!) {
    myManagedContentDetail(contentId: $contentId) {
      ...ManagedPostFields
      category {
        id
        name
      }
    }
  }
  ${MANAGED_POST_FIELDS}
`;

export const UPDATE_OWNED_CONTENT: TypedDocumentNode<
  { updateOwnedContent: ManagedPost },
  UpdateOwnedContentVariables
> = gql`
  mutation UpdateOwnedContent(
    $contentId: String!
    $input: UpdateOwnedContentInput!
  ) {
    updateOwnedContent(contentId: $contentId, input: $input) {
      ...ManagedPostFields
    }
  }
  ${MANAGED_POST_FIELDS}
`;

export const UPDATE_OWNED_CONTENT_MEDIA: TypedDocumentNode<
  { updateOwnedContentMedia: ManagedPost },
  UpdateOwnedContentMediaVariables
> = gql`
  mutation UpdateOwnedContentMedia(
    $contentId: String!
    $items: [OwnedContentMediaItemInput!]!
  ) {
    updateOwnedContentMedia(contentId: $contentId, items: $items) {
      ...ManagedPostFields
    }
  }
  ${MANAGED_POST_FIELDS}
`;

export const SET_OWNED_CONTENT_HIDDEN: TypedDocumentNode<
  { setOwnedContentHidden: ManagedPost },
  SetOwnedContentHiddenVariables
> = gql`
  mutation SetOwnedContentHidden($contentId: String!, $hidden: Boolean!) {
    setOwnedContentHidden(contentId: $contentId, hidden: $hidden) {
      ...ManagedPostFields
    }
  }
  ${MANAGED_POST_FIELDS}
`;

export const DELETE_OWNED_CONTENT: TypedDocumentNode<
  { deleteContent: boolean },
  DeleteContentVariables
> = gql`
  mutation DeleteOwnedContent($contentId: String!) {
    deleteContent(contentId: $contentId)
  }
`;

export function useMyManagedPosts(limit = 18, skip = false) {
  return useQuery(MY_MANAGED_CONTENT, {
    variables: { limit },
    skip,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });
}

export function useMyManagedPost(contentId: string) {
  return useQuery(MY_MANAGED_CONTENT_DETAIL, {
    variables: { contentId },
    fetchPolicy: "cache-and-network",
    skip: !contentId,
  });
}

export function useManagedPostMutations() {
  const [updatePost, updateState] = useMutation(UPDATE_OWNED_CONTENT);
  const [updateMedia, mediaState] = useMutation(UPDATE_OWNED_CONTENT_MEDIA);
  const [setHidden, hiddenState] = useMutation(SET_OWNED_CONTENT_HIDDEN);
  const [deletePost, deleteState] = useMutation(DELETE_OWNED_CONTENT);

  return {
    updatePost,
    updateMedia,
    setHidden,
    deletePost,
    loading:
      updateState.loading ||
      mediaState.loading ||
      hiddenState.loading ||
      deleteState.loading,
  };
}
