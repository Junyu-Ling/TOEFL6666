import { createContext, useContext } from "react";

const ActiveTabContext = createContext("practice");

export function ActiveTabProvider({ value, children }) {
  return <ActiveTabContext.Provider value={value}>{children}</ActiveTabContext.Provider>;
}

/**
 * 通过 context 而非 prop 读取当前激活的标签页，这样切换标签时只有真正
 * 关心激活状态的组件会重渲染，父级缓存的整棵子树不会被打破。
 */
export function useIsActiveTab(tabId) {
  const activeTab = useContext(ActiveTabContext);
  return activeTab === tabId;
}
