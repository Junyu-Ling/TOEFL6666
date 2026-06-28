import { useState } from "react";
import { pickRandomMotto } from "../data/mottos";

export default function MottoFooter() {
  const [motto] = useState(pickRandomMotto);

  return (
    <footer className="app-motto" aria-label="学习座右铭">
      <p className="app-motto__text">「{motto}」</p>
    </footer>
  );
}
