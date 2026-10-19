"use client";

import { useQuery, useMutation } from "@apollo/client/react";
import { useLazyQuery } from "@apollo/client/react";
import {
  GetMyProfileDocument,
  GetMyPostsDocument,
  GetMySavedContentDocument,
  GetMyAnalyticsDocument,
  UpdateMyProfileDocument,
  CheckUsernameAvailabilityDocument,
} from "@/types/__generated__/graphql";

export function useMyProfile() {
  return useQuery(GetMyProfileDocument, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
    // notifyOnNetworkStatusChange: true,
  });
}

export function useMyPosts(limit = 18) {
  return useQuery(GetMyPostsDocument, {
    variables: { limit },
    fetchPolicy: "cache-and-network",
  });
}

export function useMySavedContent(limit = 18, enabled = true) {
  return useQuery(GetMySavedContentDocument, {
    variables: { limit },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
    skip: !enabled,
  });
}

export function useMyAnalytics(enabled = true) {
  return useQuery(GetMyAnalyticsDocument, {
    fetchPolicy: "cache-and-network",
    skip: !enabled,
  });
}

export function useUpdateProfile() {
  return useMutation(UpdateMyProfileDocument, {
    refetchQueries: [{ query: GetMyProfileDocument }],
  });
}

export function useCheckUsername() {
  return useLazyQuery(CheckUsernameAvailabilityDocument);
}
