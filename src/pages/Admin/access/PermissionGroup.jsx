import { roleAllowsPermission } from "../../../features/auth/permissions.js";

function PermissionGroup({
  title,
  description,
  permissions,
  role,
  values,
  editable,
  labels,
  onChange,
}) {
  return (
    <section className="admin-permission-group">
      <div className="admin-permission-group__head">
        <div>
          <strong>{title}</strong>

          {description && <span>{description}</span>}
        </div>
      </div>

      <div className="admin-permission-group__items">
        {permissions.map((permission) => {
          const allowed = roleAllowsPermission(role, permission);
          const checked = allowed && values[permission] === true;

          return (
            <label
              key={permission}
              className={
                allowed
                  ? "admin-permission-row"
                  : "admin-permission-row admin-permission-row--locked"
              }
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!editable || !allowed}
                onChange={(event) => onChange(permission, event.target.checked)}
              />

              <span>{labels[permission]}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default PermissionGroup;
