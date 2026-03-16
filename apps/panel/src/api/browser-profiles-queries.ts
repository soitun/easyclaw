import { gql } from "@apollo/client/core";

export const BROWSER_PROFILES_QUERY = gql`
  query BrowserProfiles($filter: BrowserProfilesFilterInput, $pagination: BrowserProfilesPaginationInput) {
    browserProfiles(filter: $filter, pagination: $pagination) {
      items {
        id
        name
        proxyPolicy { enabled baseUrl }
        sessionStatePolicy { enabled checkpointIntervalSec mode storage }
        tags
        notes
        status
        createdAt
        updatedAt
      }
      total
      offset
      limit
    }
  }
`;

export const CREATE_BROWSER_PROFILE_MUTATION = gql`
  mutation CreateBrowserProfile($input: CreateBrowserProfileInput!) {
    createBrowserProfile(input: $input) {
      id
      name
      proxyPolicy { enabled baseUrl }
      sessionStatePolicy { enabled checkpointIntervalSec mode storage }
      tags
      status
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_BROWSER_PROFILE_MUTATION = gql`
  mutation UpdateBrowserProfile($id: ID!, $input: UpdateBrowserProfileInput!) {
    updateBrowserProfile(id: $id, input: $input) {
      id
      name
      proxyPolicy { enabled baseUrl }
      sessionStatePolicy { enabled checkpointIntervalSec mode storage }
      tags
      status
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_BROWSER_PROFILE_MUTATION = gql`
  mutation DeleteBrowserProfile($id: ID!) {
    deleteBrowserProfile(id: $id)
  }
`;

export const BATCH_ARCHIVE_BROWSER_PROFILES_MUTATION = gql`
  mutation BatchArchiveBrowserProfiles($ids: [ID!]!) {
    batchArchiveBrowserProfiles(ids: $ids)
  }
`;

export const BATCH_DELETE_BROWSER_PROFILES_MUTATION = gql`
  mutation BatchDeleteBrowserProfiles($ids: [ID!]!) {
    batchDeleteBrowserProfiles(ids: $ids)
  }
`;
