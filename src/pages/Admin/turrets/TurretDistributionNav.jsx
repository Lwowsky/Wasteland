import { Map, Settings2, SlidersHorizontal, Users } from "lucide-react";

const ITEMS = [
  {
    id: "settings",
    icon: Settings2,
  },
  {
    id: "turrets",
    icon: SlidersHorizontal,
  },
  {
    id: "players",
    icon: Users,
  },
  {
    id: "final",
    icon: Map,
  },
];

function TurretDistributionNav({ labels, active, onChange, ariaLabel }) {
  return (
    <nav className="turret-subtabs" aria-label={ariaLabel}>
      {ITEMS.map((item) => {
        const Icon = item.icon;

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
            <Icon size={16} />

            <span>{labels[item.id]}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default TurretDistributionNav;
