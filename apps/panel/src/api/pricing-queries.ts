import { gql } from "@apollo/client/core";

export const PRICING_QUERY = gql`
  query Pricing($deviceId: String!, $platform: String!, $appVersion: String!, $language: String!) {
    pricing(deviceId: $deviceId, platform: $platform, appVersion: $appVersion, language: $language) {
      provider
      currency
      pricingUrl
      models {
        modelId
        displayName
        inputPricePerMillion
        outputPricePerMillion
        note
      }
      subscriptions {
        id
        label
        pricingUrl
        models {
          modelId
          displayName
          inputPricePerMillion
          outputPricePerMillion
          note
        }
        plans {
          planName
          price
          currency
          planDetail {
            modelName
            volume
          }
        }
      }
    }
  }
`;
