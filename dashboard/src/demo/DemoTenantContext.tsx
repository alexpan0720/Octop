import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { capabilities, demoTenants } from "./data";
import type { DemoCapability } from "./types";
import { trackEvent } from "./storage";

const TENANT_KEY = "octop_demo_active_tenant";

interface DemoTenantValue {
  tenant: (typeof demoTenants)[number];
  setTenantId: (id: string) => void;
  capabilities: DemoCapability[];
}

const fallbackValue: DemoTenantValue = {
  tenant: demoTenants[0],
  setTenantId: () => undefined,
  capabilities: capabilities.filter((item) =>
    demoTenants[0].enabledCapabilities.includes(item.id),
  ),
};

const DemoTenantContext = createContext<DemoTenantValue>(fallbackValue);

export function DemoTenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantIdState] = useState(
    () => localStorage.getItem(TENANT_KEY) || demoTenants[0].id,
  );
  const tenant =
    demoTenants.find((item) => item.id === tenantId) || demoTenants[0];
  const value = useMemo<DemoTenantValue>(
    () => ({
      tenant,
      setTenantId: (id) => {
        const next = demoTenants.find((item) => item.id === id);
        if (!next) return;
        localStorage.setItem(TENANT_KEY, id);
        setTenantIdState(id);
        trackEvent("tenant_switch", {
          tenantId: id,
          userId: next.defaultUser.id,
        });
      },
      capabilities: [
        ...capabilities.filter((item) =>
          tenant.enabledCapabilities.includes(item.id),
        ),
        ...capabilities.filter((item) =>
          tenant.plannedCapabilities.includes(item.id),
        ),
      ],
    }),
    [tenant],
  );
  return (
    <DemoTenantContext.Provider value={value}>
      {children}
    </DemoTenantContext.Provider>
  );
}

export function useDemoTenant() {
  return useContext(DemoTenantContext);
}
