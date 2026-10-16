import { gql } from "@apollo/client";

/**
 * The listing (PDP) query.
 *
 * Lives outside ContentDetail.tsx so a server component can run it too: the
 * listing route fetches this on the server and hands the result to
 * ContentDetail as `initialPost`, which is what puts the listing's title,
 * price, description and images into the crawled HTML. A document defined
 * inside a "use client" module cannot be imported by a server component.
 */
export const ContentDetailDocument = gql`
  query ContentDetailPdp($id: String!) {
    content(id: $id) {
      id
      slug
      type
      source
      isLive
      tiktokEmbed {
        videoId
        shareUrl
        coverImageUrl
        authorUsername
        authorName
        title
        duration
      }
      title
      caption
      hashtags
      creatorId
      categoryId
      category {
        id
        name
        slug
      }
      allowDownload
      hdEnabled
      createdAt
      updatedAt
      creator {
        id
        username
        isVerified
        isFollowedByMe
        followerCount
        createdAt
        profile {
          firstName
          lastName
          avatar
        }
      }
      media {
        mediaType
        url
        imageUrl
        thumbnailUrl
        sortOrder
        displayWidth
        displayHeight
        muxMeta {
          playbackId
          duration
          aspectRatio
          thumbnailUrl
          animatedThumbnailUrl
        }
        r2Variants {
          url
          variant
          width
          height
        }
      }
      price {
        amount
        currency
        negotiable
      }
      specs {
        key
        value
      }
      aiClassification {
        categoryId
        confidence
        level1
        level2
        level3
        rawLabel
      }
      stats {
        views
        likes
        shares
        saves
        comments
      }
      location {
        country
        county
        subregion
        placeName
        formattedAddress
      }
      ranking {
        rankScore
        trendingScore
      }
      isLikedByMe
      isSavedByMe
      isMyContent
    }
  }
`;
