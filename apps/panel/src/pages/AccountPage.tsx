import { useTranslation } from "react-i18next";
import { useQuery } from "@apollo/client/react";
import { GQL } from "@easyclaw/core";
import { useAuth } from "../providers/AuthProvider.js";
import { SUBSCRIPTION_STATUS_QUERY } from "../api/auth-queries.js";

export function AccountPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const { data: subData } = useQuery<{
    subscriptionStatus: GQL.UserSubscription | null;
  }>(SUBSCRIPTION_STATUS_QUERY, { skip: !user });

  const subscription = subData?.subscriptionStatus;

  function handleLogout() {
    logout();
    onNavigate("/");
  }

  if (!user) {
    return (
      <div className="page-enter">
        <div className="section-card">
          <h2>{t("auth.loginRequired")}</h2>
          <p>{t("auth.loginFromSidebar")}</p>
        </div>
      </div>
    );
  }

  const isActive = subscription?.status === GQL.SubscriptionStatus.Active;
  const initial = (user.name ?? user.email).charAt(0).toUpperCase();

  return (
    <div className="page-enter account-page">
      <h1>{t("account.title")}</h1>

      {/* Profile card */}
      <div className="section-card account-profile-card">
        <div className="account-profile-header">
          <div className="account-profile-identity">
            <div className="account-avatar">{initial}</div>
            <div className="account-profile-name-group">
              {user.name && (
                <span className="account-profile-name">{user.name}</span>
              )}
              <span className="account-profile-email">{user.email}</span>
            </div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>
            {t("auth.logout")}
          </button>
        </div>

        <div className="account-profile-details">
          <div className="account-info-item">
            <span className="account-info-label">{t("account.plan")}</span>
            <span className="badge badge-info">{user.plan}</span>
          </div>
          <div className="account-info-item">
            <span className="account-info-label">{t("account.memberSince")}</span>
            <span className="account-info-value">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Subscription status */}
      {subscription && (
        <div className="section-card">
          <h2>{t("account.subscription")}</h2>
          <div className="account-info-grid">
            <div className="account-info-item">
              <span className="account-info-label">{t("account.plan")}</span>
              <span className="badge badge-info">{subscription.plan}</span>
            </div>
            <div className="account-info-item">
              <span className="account-info-label">{t("account.status")}</span>
              <span className={`badge ${isActive ? "badge-success" : "badge-warning"}`}>
                {subscription.status}
              </span>
            </div>
            <div className="account-info-item">
              <span className="account-info-label">{t("account.seats")}</span>
              <span className="account-info-value">
                {subscription.seatsUsed} / {subscription.seatsMax}
              </span>
            </div>
            <div className="account-info-item">
              <span className="account-info-label">{t("account.validUntil")}</span>
              <span className="account-info-value">
                {new Date(subscription.validUntil).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
