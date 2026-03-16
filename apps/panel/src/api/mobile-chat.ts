import { fetchJson } from "./client.js";
import { getClient } from "./apollo-client.js";
import { GENERATE_PAIRING_CODE, WAIT_FOR_PAIRING, GET_INSTALL_URL } from "./pairing-queries.js";

export interface MobilePairingInfo {
    id: string;
    pairingId?: string;
    deviceId: string;
    accessToken: string;
    relayUrl: string;
    createdAt: string;
    mobileDeviceId?: string;
    name?: string;
}

export interface MobilePairingStatusResponse {
    pairings?: MobilePairingInfo[];
    activeCode?: { code: string; expiresAt: number } | null;
    desktopDeviceId?: string;
    error?: string;
}

export interface RegisterPairingBody {
    pairingId?: string;
    desktopDeviceId: string;
    accessToken: string;
    relayUrl: string;
    mobileDeviceId?: string;
}

/** Call cloud GraphQL to generate a pairing code. */
export async function generateMobilePairingCode(
    desktopDeviceId: string,
): Promise<{ code?: string; qrUrl?: string; error?: string }> {
    const client = getClient();
    const { data } = await client.mutate<{
        generatePairingCode: { code: string; qrUrl?: string };
    }>({
        mutation: GENERATE_PAIRING_CODE,
        variables: { desktopDeviceId },
    });
    const result = data?.generatePairingCode;
    return { code: result?.code, qrUrl: result?.qrUrl };
}

/** Long-poll cloud GraphQL waiting for the mobile device to complete pairing. */
export async function waitForPairing(code: string): Promise<{
    paired: boolean;
    pairingId?: string;
    accessToken?: string;
    relayUrl?: string;
    desktopDeviceId?: string;
    mobileDeviceId?: string;
    reason?: string;
}> {
    const client = getClient();
    const { data } = await client.query<{
        waitForPairing: {
            paired: boolean;
            pairingId?: string;
            accessToken?: string;
            relayUrl?: string;
            desktopDeviceId?: string;
            mobileDeviceId?: string;
            reason?: string;
        };
    }>({
        query: WAIT_FOR_PAIRING,
        variables: { code },
        fetchPolicy: "network-only",
    });
    return data?.waitForPairing ?? { paired: false };
}

/** Fetch the PWA install URL from the cloud via GraphQL. */
export async function getInstallUrl(): Promise<{ installUrl?: string; error?: string }> {
    const client = getClient();
    const { data } = await client.query<{ mobileInstallUrl: string }>({
        query: GET_INSTALL_URL,
        fetchPolicy: "network-only",
    });
    return { installUrl: data?.mobileInstallUrl };
}

/** Push a successful pairing result to the desktop for local side-effects via local GraphQL. */
export async function registerPairing(body: RegisterPairingBody): Promise<{ success?: boolean; error?: string }> {
    const response = await fetchJson<{
        data?: { registerPairing: { success: boolean; pairingId: string } } | null;
        errors?: Array<{ message: string }>;
    }>("/graphql/mobile", {
        method: "POST",
        body: JSON.stringify({
            query: `mutation RegisterPairing($input: RegisterPairingInput!) {
                registerPairing(input: $input) {
                    success
                    pairingId
                }
            }`,
            variables: { input: body },
        }),
    });

    if (response.errors?.length) {
        return { error: response.errors[0]!.message };
    }

    return { success: response.data?.registerPairing?.success };
}

/** Get current pairing status (pairings list, desktopDeviceId) from the desktop. */
export async function getMobilePairingStatus(): Promise<MobilePairingStatusResponse> {
    return await fetchJson<MobilePairingStatusResponse>("/mobile/status", {
        method: "GET"
    });
}

export interface MobileDeviceStatusResponse {
    devices: Record<string, { relayConnected: boolean; mobileOnline: boolean; stale?: boolean }>;
}

export async function fetchMobileDeviceStatus(): Promise<MobileDeviceStatusResponse> {
    return await fetchJson<MobileDeviceStatusResponse>("/mobile/device-status", {
        method: "GET"
    });
}

export async function disconnectMobilePairing(pairingId?: string): Promise<{ error?: string }> {
    const query = pairingId ? `?pairingId=${encodeURIComponent(pairingId)}` : "";
    return await fetchJson<{ error?: string }>(`/mobile/disconnect${query}`, {
        method: "DELETE"
    });
}
