import { getPhoneticPair } from "../services/phonetics";

export default function PhoneticLine({ word, className = "", hidden = false }) {
  if (hidden || !word) return null;

  const { us, uk } = getPhoneticPair(word);
  if (!us && !uk) return null;

  if (us && uk && us === uk) {
    return <p className={`phonetic-line ${className}`.trim()}>{us}</p>;
  }

  return (
    <p className={`phonetic-line ${className}`.trim()}>
      {us ? (
        <span className="phonetic-line__item">
          <span className="phonetic-line__label">美</span>
          {us}
        </span>
      ) : null}
      {uk ? (
        <span className="phonetic-line__item">
          <span className="phonetic-line__label">英</span>
          {uk}
        </span>
      ) : null}
    </p>
  );
}
