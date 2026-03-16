import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider.js";
import type { AvailableTool } from "../api/tool-registry.js";
import { fetchAvailableTools } from "../api/tool-registry.js";

interface ToolRegistryState {
  tools: AvailableTool[];
  hasTools: boolean;
}

const ToolRegistryContext = createContext<ToolRegistryState>({
  tools: [],
  hasTools: false,
});

export function useToolRegistry() {
  return useContext(ToolRegistryContext);
}

export function ToolRegistryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tools, setTools] = useState<AvailableTool[]>([]);

  useEffect(() => {
    if (!user) {
      setTools([]);
      return;
    }
    fetchAvailableTools().then(setTools);
  }, [user]);

  const hasTools = tools.length > 0;

  return (
    <ToolRegistryContext.Provider value={{ tools, hasTools }}>
      {children}
    </ToolRegistryContext.Provider>
  );
}
