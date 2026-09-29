import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useDemoTenant } from "../../../demo/DemoTenantContext";
import { trackEvent } from "../../../demo/storage";
import { getResearchContext } from "../../../demo/storage";
import prototypeMarkup from "./prototypeMarkup.html?raw";
import { mountIndustryResearchPrototype } from "./prototypeRuntime";
import prototypeStyles from "./prototypeStyles.css?raw";
import styles from "./index.module.less";

export default function IndustryResearchPage() {
  const { contextId = "" } = useParams();
  const { tenant } = useDemoTenant();
  const context = getResearchContext(contextId);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    const surface = document.createElement("div");
    style.textContent = prototypeStyles;
    surface.className = "prototype-body";
    surface.innerHTML = prototypeMarkup;
    root.replaceChildren(style, surface);
    mountIndustryResearchPrototype(root, {
      initialChainKey: context?.industryId,
      liveResult: context?.liveResult,
    });

    return () => root.replaceChildren();
  }, [context?.industryId, context?.liveResult]);

  useEffect(() => {
    trackEvent("workspace_open", {
      tenantId: tenant.id,
      userId: tenant.defaultUser.id,
      capabilityId: "industry_research",
      contextId,
    });
  }, [contextId, tenant]);

  return <div ref={hostRef} className={styles.page} />;
}
