import { useTranslation } from "react-i18next";
import { CustomerServiceCard } from "../components/CustomerServiceCard.js";

interface AppsPageProps {
  onNavigate: (path: string) => void;
}

export function AppsPage({ onNavigate }: AppsPageProps) {
  const { t } = useTranslation();

  return (
    <div className="page-enter">
      <h1>{t("customerService.title")}</h1>
      <CustomerServiceCard onNavigate={onNavigate} />
    </div>
  );
}
