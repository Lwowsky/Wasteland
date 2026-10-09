import { ROLES } from "../../../features/auth/permissions.js";

const ROLE_IMAGES = {
  [ROLES.OWNER]: "/images/admin/icons/owner.webp",
  [ROLES.ADMIN]: "/images/admin/icons/admin.webp",
  [ROLES.CONSUL]: "/images/admin/icons/consul.webp",
  requests: "/images/admin/icons/access-requests.webp",
};

const BACKGROUND_IMAGES = {
  [ROLES.OWNER]: "/images/admin/access/owner-bg.webp",
  [ROLES.ADMIN]: "/images/admin/access/admin-bg.webp",
  [ROLES.CONSUL]: "/images/admin/access/consul-bg.webp",
  requests: "/images/admin/access/requests-bg.webp",
};

const COUNTER_IMAGES = {
  [ROLES.OWNER]: "/images/admin/icons/users-count.webp",
  [ROLES.ADMIN]: "/images/admin/icons/users-count.webp",
  [ROLES.CONSUL]: "/images/admin/icons/users-count.webp",
  requests: "/images/admin/icons/requests-count.webp",
};

function AccessOverviewCards({
  t,
  adminUsers = [],
  requests = [],
  canViewRequests,
  onOpenRequests,
}) {
  const ownerCount = adminUsers.filter(
    (user) => user.role === ROLES.OWNER,
  ).length;

  const adminCount = adminUsers.filter(
    (user) => user.role === ROLES.ADMIN,
  ).length;

  const consulCount = adminUsers.filter(
    (user) => user.role === ROLES.CONSUL,
  ).length;

  const pendingRequestsCount = requests.filter(
    (request) => !request.status || request.status === "pending",
  ).length;

  const cards = [
    {
      key: ROLES.OWNER,
      title: t.access.roles.owner.title,
      description: t.access.roles.owner.description,
      count: ownerCount,
      countText: t.access.cards.usersCount,
    },
    {
      key: ROLES.ADMIN,
      title: t.access.roles.admin.title,
      description: t.access.roles.admin.description,
      count: adminCount,
      countText: t.access.cards.usersCount,
    },
    {
      key: ROLES.CONSUL,
      title: t.access.roles.consul.title,
      description: t.access.roles.consul.description,
      count: consulCount,
      countText: t.access.cards.usersCount,
    },
  ];

  if (canViewRequests) {
    cards.push({
      key: "requests",
      title: t.access.cards.requests.title,
      description: t.access.cards.requests.description,
      count: pendingRequestsCount,
      countText: t.access.cards.requests.pending,
      onClick: onOpenRequests,
    });
  }

  return (
    <div className="admin-overview-grid">
      {cards.map((card) => {
        const content = (
          <>
            <div className="admin-overview-card__top-line" />

            <img
              className="admin-overview-card__background-image"
              src={BACKGROUND_IMAGES[card.key]}
              alt=""
              aria-hidden="true"
            />

            <div className="admin-overview-card__header">
              <div className="admin-overview-card__icon-wrap">
                <img
                  className="admin-overview-card__icon"
                  src={ROLE_IMAGES[card.key]}
                  alt=""
                  aria-hidden="true"
                />
              </div>

              <div className="admin-overview-card__content">
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
            </div>

            <div className="admin-overview-card__footer">
              <span className="admin-overview-card__count">
                <img
                  className="admin-overview-card__count-icon"
                  src={COUNTER_IMAGES[card.key]}
                  alt=""
                  aria-hidden="true"
                />

                <strong>{card.count}</strong>

                <span>{card.countText}</span>
              </span>
            </div>
          </>
        );

        if (card.onClick) {
          return (
            <button
              key={card.key}
              type="button"
              className={`admin-overview-card admin-overview-card--${card.key}`}
              onClick={card.onClick}
              aria-label={card.title}
            >
              {content}
            </button>
          );
        }

        return (
          <article
            key={card.key}
            className={`admin-overview-card admin-overview-card--${card.key}`}
          >
            {content}
          </article>
        );
      })}
    </div>
  );
}

export default AccessOverviewCards;
