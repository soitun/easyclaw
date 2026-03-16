import { useMemo } from "react";
import { ApolloProvider } from "@apollo/client/react";
import { useTranslation } from "react-i18next";
import { createApolloClient } from "../api/apollo-client.js";

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const client = useMemo(() => createApolloClient(i18n.language), [i18n.language]);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
