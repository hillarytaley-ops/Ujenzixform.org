import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Syncs tab state with URL search params so that refreshing keeps the current tab.
 * @param validTabs - Set of valid tab values (e.g. ['overview', 'orders'])
 * @param defaultTab - Tab to use when URL has no tab or an invalid tab
 */
export function useUrlTabSync(
  validTabs: readonly string[] | string[],
  defaultTab: string
): [string, (tab: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const validSet = new Set(validTabs);
  const tabFromUrl = searchParams.get("tab");
  const initialTab =
    tabFromUrl && validSet.has(tabFromUrl) ? tabFromUrl : defaultTab;

  const [activeTab, setActiveTabState] = useState(initialTab);

  // Sync from URL when it changes (e.g. browser back/forward)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && validSet.has(tab)) {
      setActiveTabState(tab);
    }
  }, [searchParams]);

  const setActiveTab = useCallback(
    (tab: string) => {
      setActiveTabState(tab);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (validSet.has(tab)) {
            next.set("tab", tab);
          } else {
            next.delete("tab");
          }
          return next;
        },
        { replace: true }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- validSet from validTabs
    [validTabs, setSearchParams]
  );

  return [activeTab, setActiveTab];
}
