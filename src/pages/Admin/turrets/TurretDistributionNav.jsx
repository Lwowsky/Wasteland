import { publicAsset } from "../../../utils/publicAsset.js";

const ITEMS = [
  {
    id: "settings",
    image: "/images/admin/icons/settings.webp",
  },
  {
    id: "turrets",
    image: "/images/admin/icons/turret-distribution.webp",
  },
  {
    id: "players",
    image: "/images/admin/icons/actions/players.webp",
  },
  {
    id: "final",
    image: "/images/admin/icons/final-plan.webp",
  },
];

function TurretDistributionNav({ labels, active, onChange, ariaLabel }) {
  return (
    <nav className="turret-subtabs" aria-label={ariaLabel}>
      {ITEMS.map((item) => {
        return (
          <button
            key={item.id}
            type="button"
            className={
              active === item.id
                ? "turret-subtab turret-subtab--active"
                : "turret-subtab"
            }
            onClick={() => onChange(item.id)}
          >
            <img className="turret-subtab__image" src={publicAsset(item.image)} alt="" aria-hidden="true" />

            <span>{labels[item.id]}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default TurretDistributionNav;
