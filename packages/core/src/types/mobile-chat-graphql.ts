export interface MobileGraphQLError {
  message: string;
  path?: string[];
  extensions?: { code: string };
}

export interface MobileGraphQLRequest {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export interface MobileGraphQLResponse<TData = Record<string, unknown>> {
  data?: TData | null;
  errors?: MobileGraphQLError[];
}

/** Input type for the registerPairing mutation. */
export interface RegisterPairingInput {
  pairingId?: string;
  desktopDeviceId: string;
  accessToken: string;
  relayUrl: string;
  mobileDeviceId?: string;
}

/** Result returned by the registerPairing mutation. */
export interface RegisterPairingResult {
  success: boolean;
  pairingId: string;
}
