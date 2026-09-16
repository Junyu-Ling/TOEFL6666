import { useAccess } from "../context/AccessContext";
import FeatureGate from "./FeatureGate";

export default function ReadingFillGate({ children, onLogin }) {
  const { canUseReadingFill } = useAccess();
  return (
    <FeatureGate title="阅读填词" allowed={canUseReadingFill} onLogin={onLogin}>
      {children}
    </FeatureGate>
  );
}
