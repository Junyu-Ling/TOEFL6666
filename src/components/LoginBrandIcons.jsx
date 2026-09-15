function Icon({ children, label }) {
  return (
    <svg className="login-modal__brand-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <title>{label}</title>
      {children}
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <Icon label="Google">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.3h6.46c-.28 1.5-1.12 2.77-2.39 3.63v3.02h3.87c2.26-2.08 3.55-5.15 3.55-8.68z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-3.02c-1.08.72-2.45 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.97H1.26v3.11C3.24 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.25 14.25c-.24-.72-.38-1.49-.38-2.25s.14-1.53.38-2.25V6.64H1.26C.46 8.24 0 10.06 0 12s.46 3.76 1.26 5.36l3.99-3.11z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.31 0 3.24 2.7 1.26 6.64l3.99 3.11C6.2 6.87 8.86 4.75 12 4.75z" />
    </Icon>
  );
}

export function GitHubIcon() {
  return (
    <Icon label="GitHub">
      <path
        fill="currentColor"
        d="M12 .3C5.37.3 0 5.67 0 12.3c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.28-.01-1.02-.02-2.01-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.77.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.3C24 5.67 18.63.3 12 .3z"
      />
    </Icon>
  );
}

export function EmailIcon() {
  return (
    <Icon label="邮箱">
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"
      />
    </Icon>
  );
}

export function PhoneIcon() {
  return (
    <Icon label="手机号">
      <path
        fill="currentColor"
        d="M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"
      />
    </Icon>
  );
}

const ICONS = {
  google: GoogleIcon,
  github: GitHubIcon,
  email: EmailIcon,
  phone: PhoneIcon,
};

export function LoginBrandIcon({ id }) {
  const Comp = ICONS[id];
  return Comp ? <Comp /> : null;
}
