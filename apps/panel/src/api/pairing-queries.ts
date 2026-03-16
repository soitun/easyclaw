import { gql } from "@apollo/client/core";

export const GENERATE_PAIRING_CODE = gql`
  mutation GeneratePairingCode($desktopDeviceId: String!) {
    generatePairingCode(desktopDeviceId: $desktopDeviceId) {
      code
      qrUrl
    }
  }
`;

export const WAIT_FOR_PAIRING = gql`
  query WaitForPairing($code: String!) {
    waitForPairing(code: $code) {
      paired
      pairingId
      accessToken
      relayUrl
      desktopDeviceId
      mobileDeviceId
      reason
    }
  }
`;

export const GET_INSTALL_URL = gql`
  query GetInstallUrl {
    mobileInstallUrl
  }
`;
