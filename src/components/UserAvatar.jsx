import { getInitials } from "../utils/userProfile";

export default function UserAvatar({ name, avatarUrl, size = 36, className = "" }) {
  const style = { width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.38)) };
  const initials = getInitials(name);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`user-avatar ${className}`.trim()}
        style={style}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className={`user-avatar user-avatar--fallback ${className}`.trim()}
      style={style}
      aria-hidden
    >
      {initials}
    </span>
  );
}
