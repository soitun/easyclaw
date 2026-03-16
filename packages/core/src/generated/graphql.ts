export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.This scalar is serialized to a string in ISO 8601 format and parsed from a string in ISO 8601 format. */
  DateTimeISO: { input: any; output: any; }
}

/** Authentication response with JWT tokens */
export interface AuthPayload {
  accessToken: Scalars['String']['output'];
  email: Scalars['String']['output'];
  plan: UserPlan;
  refreshToken: Scalars['String']['output'];
  userId: Scalars['String']['output'];
}

/** Isolated browser profile for multi-profile agent sessions */
export interface BrowserProfile {
  createdAt: Scalars['DateTimeISO']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  proxyPolicy?: Maybe<BrowserProfileProxyPolicy>;
  status: BrowserProfileStatus;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  updatedAt: Scalars['DateTimeISO']['output'];
  userId: Scalars['String']['output'];
}

/** Actions recorded in browser profile audit log */
export const BrowserProfileAuditAction = {
  Archived: 'ARCHIVED',
  Created: 'CREATED',
  Materialized: 'MATERIALIZED',
  ProxyTested: 'PROXY_TESTED',
  Updated: 'UPDATED'
} as const;

export type BrowserProfileAuditAction = typeof BrowserProfileAuditAction[keyof typeof BrowserProfileAuditAction];
/** Audit log entry for a browser profile action */
export interface BrowserProfileAuditEntry {
  action: BrowserProfileAuditAction;
  createdAt: Scalars['DateTimeISO']['output'];
  /** JSON-encoded detail payload */
  details?: Maybe<Scalars['String']['output']>;
  profileId: Scalars['String']['output'];
  userId: Scalars['String']['output'];
}

/** Proxy configuration for a browser profile */
export interface BrowserProfileProxyPolicy {
  /** Proxy authentication string — NOT stored directly, reference to secret store */
  auth?: Maybe<Scalars['String']['output']>;
  baseUrl?: Maybe<Scalars['String']['output']>;
  enabled: Scalars['Boolean']['output'];
}

/** Lifecycle status of a browser profile */
export const BrowserProfileStatus = {
  Active: 'ACTIVE',
  Archived: 'ARCHIVED',
  Disabled: 'DISABLED'
} as const;

export type BrowserProfileStatus = typeof BrowserProfileStatus[keyof typeof BrowserProfileStatus];
/** Customer service platform configurations (singleton) */
export interface CsConfig {
  wecom?: Maybe<WeComConfig>;
}

/** Customer service seat allocation */
export interface CsSeat {
  connectedAt?: Maybe<Scalars['DateTimeISO']['output']>;
  createdAt: Scalars['DateTimeISO']['output'];
  gatewayId: Scalars['String']['output'];
  status: SeatStatus;
  updatedAt: Scalars['DateTimeISO']['output'];
  userId: Scalars['String']['output'];
}

/** Per-seat usage record for a billing period */
export interface CsUsageRecord {
  createdAt: Scalars['DateTimeISO']['output'];
  messageCount: Scalars['Int']['output'];
  period: Scalars['String']['output'];
  seatId: Scalars['String']['output'];
  tokenUsage: Scalars['Int']['output'];
  updatedAt: Scalars['DateTimeISO']['output'];
  userId: Scalars['String']['output'];
}

/** Input for creating a new browser profile */
export interface CreateBrowserProfileInput {
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  proxyBaseUrl?: InputMaybe<Scalars['String']['input']>;
  proxyEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
}

/** Supported payment currencies */
export const Currency = {
  Cny: 'CNY',
  Usd: 'USD'
} as const;

export type Currency = typeof Currency[keyof typeof Currency];
/** Result of checking a specific entitlement */
export interface EntitlementCheckResult {
  allowed: Scalars['Boolean']['output'];
  key: EntitlementKey;
  /** Human-readable denial reason */
  reason?: Maybe<Scalars['String']['output']>;
}

/** Feature entitlement identifiers */
export const EntitlementKey = {
  BrowserProfilesAgentWrite: 'BROWSER_PROFILES_AGENT_WRITE',
  BrowserProfilesEdit: 'BROWSER_PROFILES_EDIT',
  MultiBrowserProfiles: 'MULTI_BROWSER_PROFILES'
} as const;

export type EntitlementKey = typeof EntitlementKey[keyof typeof EntitlementKey];
/** Origin of an entitlement grant */
export const EntitlementSource = {
  Override: 'OVERRIDE',
  Plan: 'PLAN',
  Trial: 'TRIAL'
} as const;

export type EntitlementSource = typeof EntitlementSource[keyof typeof EntitlementSource];
export interface GeneratePairingResult {
  code: Scalars['String']['output'];
  qrUrl?: Maybe<Scalars['String']['output']>;
}

/** Login input */
export interface LoginInput {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}

/** Current user profile */
export interface MeResponse {
  createdAt: Scalars['DateTimeISO']['output'];
  email: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  plan: UserPlan;
  userId: Scalars['String']['output'];
}

export interface ModelPricing {
  displayName: Scalars['String']['output'];
  inputPricePerMillion: Scalars['String']['output'];
  modelId: Scalars['String']['output'];
  note?: Maybe<Scalars['String']['output']>;
  outputPricePerMillion: Scalars['String']['output'];
}

export interface Mutation {
  /** Allocate a new seat to a gateway */
  allocateSeat: CsSeat;
  /** Start checkout for a subscription plan */
  checkout: UserSubscription;
  /** Create a new browser profile */
  createBrowserProfile: BrowserProfile;
  /** Deallocate a seat by ID */
  deallocateSeat: Scalars['Boolean']['output'];
  /** Delete a browser profile permanently */
  deleteBrowserProfile: Scalars['Boolean']['output'];
  /** Delete WeCom customer service credentials */
  deleteWeComConfig: CsConfig;
  /** Generate a 6-character pairing code for QR display */
  generatePairingCode: GeneratePairingResult;
  /** Log in with email and password */
  login: AuthPayload;
  /** Log out (revoke the provided refresh token) */
  logout: Scalars['Boolean']['output'];
  /** Refresh an expired access token */
  refreshToken: AuthPayload;
  /** Register a new user account */
  register: AuthPayload;
  /** Revoke all sessions for the current user (remote logout) */
  revokeAllSessions: Scalars['Int']['output'];
  /** Save WeCom customer service credentials */
  saveWeComConfig: CsConfig;
  /** Update an existing browser profile */
  updateBrowserProfile?: Maybe<BrowserProfile>;
  /** Verify a pairing code from mobile and create relay token */
  verifyPairingCode: VerifyPairingResult;
}


export interface MutationAllocateSeatArgs {
  gatewayId: Scalars['String']['input'];
}


export interface MutationCheckoutArgs {
  planId: UserPlan;
}


export interface MutationCreateBrowserProfileArgs {
  input: CreateBrowserProfileInput;
}


export interface MutationDeallocateSeatArgs {
  seatId: Scalars['String']['input'];
}


export interface MutationDeleteBrowserProfileArgs {
  id: Scalars['ID']['input'];
}


export interface MutationDeleteWeComConfigArgs {
  corpId: Scalars['String']['input'];
}


export interface MutationGeneratePairingCodeArgs {
  desktopDeviceId: Scalars['String']['input'];
}


export interface MutationLoginArgs {
  input: LoginInput;
}


export interface MutationLogoutArgs {
  refreshToken: Scalars['String']['input'];
}


export interface MutationRefreshTokenArgs {
  refreshToken: Scalars['String']['input'];
}


export interface MutationRegisterArgs {
  input: RegisterInput;
}


export interface MutationSaveWeComConfigArgs {
  input: WeComConfigInput;
}


export interface MutationUpdateBrowserProfileArgs {
  id: Scalars['ID']['input'];
  input: UpdateBrowserProfileInput;
}


export interface MutationVerifyPairingCodeArgs {
  mobileDeviceId: Scalars['String']['input'];
  pairingCode: Scalars['String']['input'];
}

export interface Plan {
  currency: Scalars['String']['output'];
  planDetail: Array<PlanDetail>;
  planName: Scalars['String']['output'];
  price: Scalars['String']['output'];
}

/** Plan definition with limits and pricing */
export interface PlanDefinition {
  maxSeats: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  planId: UserPlan;
  priceCurrency: Currency;
  priceMonthly: Scalars['String']['output'];
}

export interface PlanDetail {
  modelName: Scalars['String']['output'];
  volume: Scalars['String']['output'];
}

export interface ProviderPricing {
  currency: Scalars['String']['output'];
  models: Array<ModelPricing>;
  pricingUrl: Scalars['String']['output'];
  provider: Scalars['String']['output'];
  subscriptions?: Maybe<Array<Subscription>>;
}

export interface Query {
  /** Get a single browser profile by ID */
  browserProfile?: Maybe<BrowserProfile>;
  /** Get audit log for a browser profile */
  browserProfileAuditLog: Array<BrowserProfileAuditEntry>;
  /** Get the browser profiles prompt addendum (requires entitlement) */
  browserProfilePromptAddendum?: Maybe<Scalars['String']['output']>;
  /** List browser profiles for the authenticated user */
  browserProfiles: Array<BrowserProfile>;
  /** Check whether the user has a specific entitlement */
  checkEntitlement: EntitlementCheckResult;
  /** Get customer service platform configuration */
  csConfig?: Maybe<CsConfig>;
  /** List all entitlements for the authenticated user */
  entitlements: Array<UserEntitlement>;
  /** Get current authenticated user profile */
  me: MeResponse;
  /** Get PWA install URL (base URL without pairing code) */
  mobileInstallUrl: Scalars['String']['output'];
  /** List all available plan definitions */
  planDefinitions: Array<PlanDefinition>;
  /** Get pricing for all providers */
  pricing: Array<ProviderPricing>;
  /** Get seat usage records for a billing period */
  seatUsage: Array<CsUsageRecord>;
  /** List all allocated seats for the current user */
  seats: Array<CsSeat>;
  /** Get a single skill by slug */
  skill?: Maybe<Skill>;
  /** Get all skill categories with counts */
  skillCategories: Array<SkillCategoryResult>;
  /** Search and browse marketplace skills */
  skills: SkillConnection;
  /** Get current user subscription status */
  subscriptionStatus?: Maybe<UserSubscription>;
  /** Batch-verify relay access tokens */
  verifyRelayTokens: Array<RelayTokenResult>;
  /** Long-poll for pairing completion (30s timeout) */
  waitForPairing: WaitPairingResult;
}


export interface QueryBrowserProfileArgs {
  id: Scalars['ID']['input'];
}


export interface QueryBrowserProfileAuditLogArgs {
  profileId: Scalars['ID']['input'];
}


export interface QueryCheckEntitlementArgs {
  key: EntitlementKey;
}


export interface QueryPricingArgs {
  appVersion?: InputMaybe<Scalars['String']['input']>;
  deviceId?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<Scalars['String']['input']>;
}


export interface QuerySeatUsageArgs {
  period?: InputMaybe<Scalars['String']['input']>;
}


export interface QuerySkillArgs {
  slug: Scalars['String']['input'];
}


export interface QuerySkillsArgs {
  category?: InputMaybe<Scalars['String']['input']>;
  chinaAvailable?: InputMaybe<Scalars['Boolean']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
}


export interface QueryVerifyRelayTokensArgs {
  tokens: Array<Scalars['String']['input']>;
}


export interface QueryWaitForPairingArgs {
  code: Scalars['String']['input'];
}

/** Registration input */
export interface RegisterInput {
  email: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
}

export interface RelayTokenResult {
  desktopDeviceId?: Maybe<Scalars['String']['output']>;
  mobileDeviceId?: Maybe<Scalars['String']['output']>;
  pairingId?: Maybe<Scalars['String']['output']>;
  valid: Scalars['Boolean']['output'];
}

/** Seat connection states */
export const SeatStatus = {
  Active: 'ACTIVE',
  Suspended: 'SUSPENDED'
} as const;

export type SeatStatus = typeof SeatStatus[keyof typeof SeatStatus];
export interface Skill {
  author: Scalars['String']['output'];
  chinaAvailable: Scalars['Boolean']['output'];
  desc_en: Scalars['String']['output'];
  desc_zh: Scalars['String']['output'];
  downloads: Scalars['Int']['output'];
  hidden: Scalars['Boolean']['output'];
  labels: Array<SkillLabel>;
  labelsManuallyOverridden: Scalars['Boolean']['output'];
  name_en: Scalars['String']['output'];
  name_zh: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  stars: Scalars['Int']['output'];
  tags: Array<Scalars['String']['output']>;
  version: Scalars['String']['output'];
}

export interface SkillCategoryResult {
  count: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  name_en: Scalars['String']['output'];
  name_zh: Scalars['String']['output'];
}

export interface SkillConnection {
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  skills: Array<Skill>;
  total: Scalars['Int']['output'];
}

/** Editorial labels for skill promotion */
export const SkillLabel = {
  Recommended: 'RECOMMENDED'
} as const;

export type SkillLabel = typeof SkillLabel[keyof typeof SkillLabel];
export interface Subscription {
  id: Scalars['String']['output'];
  label: Scalars['String']['output'];
  models?: Maybe<Array<ModelPricing>>;
  plans: Array<Plan>;
  pricingUrl: Scalars['String']['output'];
}

/** Subscription lifecycle states */
export const SubscriptionStatus = {
  Active: 'ACTIVE',
  Canceled: 'CANCELED',
  Expired: 'EXPIRED',
  PastDue: 'PAST_DUE'
} as const;

export type SubscriptionStatus = typeof SubscriptionStatus[keyof typeof SubscriptionStatus];
/** Input for updating an existing browser profile */
export interface UpdateBrowserProfileInput {
  name?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  proxyBaseUrl?: InputMaybe<Scalars['String']['input']>;
  proxyEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<BrowserProfileStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
}

/** A single entitlement granted to a user */
export interface UserEntitlement {
  enabled: Scalars['Boolean']['output'];
  key: EntitlementKey;
  source: EntitlementSource;
}

/** Subscription plan tiers */
export const UserPlan = {
  Enterprise: 'ENTERPRISE',
  Free: 'FREE',
  Pro: 'PRO'
} as const;

export type UserPlan = typeof UserPlan[keyof typeof UserPlan];
/** User subscription record */
export interface UserSubscription {
  createdAt: Scalars['DateTimeISO']['output'];
  plan: UserPlan;
  seatsMax: Scalars['Int']['output'];
  seatsUsed: Scalars['Int']['output'];
  status: SubscriptionStatus;
  stripeSubscriptionId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTimeISO']['output'];
  userId: Scalars['String']['output'];
  validUntil: Scalars['DateTimeISO']['output'];
}

export interface VerifyPairingResult {
  accessToken: Scalars['String']['output'];
  desktopDeviceId: Scalars['String']['output'];
  pairingId: Scalars['String']['output'];
  relayUrl: Scalars['String']['output'];
}

export interface WaitPairingResult {
  accessToken?: Maybe<Scalars['String']['output']>;
  desktopDeviceId?: Maybe<Scalars['String']['output']>;
  mobileDeviceId?: Maybe<Scalars['String']['output']>;
  paired: Scalars['Boolean']['output'];
  pairingId?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  relayUrl?: Maybe<Scalars['String']['output']>;
}

/** WeCom (企业微信) customer service credentials */
export interface WeComConfig {
  appSecret: Scalars['String']['output'];
  corpId: Scalars['String']['output'];
  encodingAesKey: Scalars['String']['output'];
  kfLinkId: Scalars['String']['output'];
  openKfId: Scalars['String']['output'];
  token: Scalars['String']['output'];
}

/** Input for saving WeCom customer service credentials */
export interface WeComConfigInput {
  appSecret: Scalars['String']['input'];
  corpId: Scalars['String']['input'];
  encodingAesKey: Scalars['String']['input'];
  kfLinkId: Scalars['String']['input'];
  token: Scalars['String']['input'];
}
