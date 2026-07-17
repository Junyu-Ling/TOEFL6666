export default function TabPanel({ tabId, activeTab, children }) {
  const isActive = activeTab === tabId;

  return (
    <section hidden={!isActive} inert={!isActive} aria-hidden={isActive ? undefined : true}>
      {children}
    </section>
  );
}
