import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@apollo/client/react";
import { GQL } from "@easyclaw/core";
import { useAuth } from "../providers/AuthProvider.js";
import { SUBSCRIPTION_STATUS_QUERY } from "../api/auth-queries.js";

interface AuthGateProps {
  children: ReactNode;
  /** Where to navigate for login (default: "/account") */
  loginPath?: string;
  /** Where to navigate for upgrade (default: "/account") */
  upgradePath?: string;
  /** Navigation callback */
  onNavigate: (path: string) => void;
  /** Optional: custom loading element */
  loadingElement?: ReactNode;
  /** If true, skip the subscription check — only require login (default: false) */
  skipSubscriptionCheck?: boolean;
}

export function AuthGate({
  children,
  loginPath = "/account",
  upgradePath = "/account",
  onNavigate,
  loadingElement,
  skipSubscriptionCheck = false,
}: AuthGateProps) {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();

  const { data: subData, loading: subLoading } = useQuery<{
    subscriptionStatus: GQL.UserSubscription;
  }>(SUBSCRIPTION_STATUS_QUERY, { skip: !user || skipSubscriptionCheck });
  const subscription = subData?.subscriptionStatus;

  if (authLoading) {
    if (loadingElement) return <>{loadingElement}</>;
    return (
      <div className="section-card auth-gate-card">
        <p className="form-hint">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="section-card auth-gate-card" data-testid="auth-gate-login">
        <h3>{t("authGate.loginRequired")}</h3>
        <p className="form-hint">{t("authGate.loginRequiredDesc")}</p>
        <button
          className="btn btn-primary"
          onClick={() => onNavigate(loginPath)}
          type="button"
        >
          {t("auth.login")}
        </button>
      </div>
    );
  }

  if (!skipSubscriptionCheck && subLoading) {
    if (loadingElement) return <>{loadingElement}</>;
    return (
      <div className="section-card auth-gate-card">
        <p className="form-hint">{t("common.loading")}</p>
      </div>
    );
  }

  if (!skipSubscriptionCheck && subscription?.status !== "ACTIVE") {
    return (
      <div className="section-card auth-gate-card" data-testid="auth-gate-upgrade">
        <h3>{t("authGate.subscriptionRequired")}</h3>
        <p className="form-hint">{t("authGate.subscriptionRequiredDesc")}</p>
        <button
          className="btn btn-primary"
          onClick={() => onNavigate(upgradePath)}
          type="button"
        >
          {t("authGate.upgradeAction")}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
