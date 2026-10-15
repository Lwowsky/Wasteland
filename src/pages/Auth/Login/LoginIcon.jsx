const ICONS = {
  login: "/images/admin/icons/actions/lock.webp",
  request: "/images/admin/icons/access-requests.webp",
  shared: "/images/admin/icons/consul.webp",
  email: "/images/admin/icons/access-requests.webp",
  user: "/images/admin/icons/actions/players.webp",
  success: "/images/admin/icons/actions/approve.webp",
};

export default function LoginIcon({ name, size = "field" }) {
  return (
    <img
      className={`login-art-icon login-art-icon--${size}`}
      src={ICONS[name]}
      alt=""
      aria-hidden="true"
    />
  );
}
