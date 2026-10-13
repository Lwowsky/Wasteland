import { useState } from "react";
import { PLANNER_SHIFTS, TURRET_IDS } from "../../../features/turrets/plannerConstants.js";
import Modal from "../../../components/Modal/Modal.jsx";
import { REGISTRATION_TIERS } from "../../../../shared/registrationConfig.js";

/** Modal edits only the planning snapshot; registrations remain unchanged. */
function TurretPlayerEditModal({ a, player, shift, tower, role, availableTiers, activeShifts = PLANNER_SHIFTS, onSave, onRelease, onClose }) {
  const labels = a.distribution.towerEditor;
  const [error, setError] = useState("");
  const save = () => {
    if (onSave(form, destination) === false) setError(labels.saveRejected);
  };
  const release = () => {
    if (onRelease() === false) setError(labels.saveRejected);
  };
  const [destination, setDestination] = useState({ shift, tower, role });
  const changeDestination = (field) => (event) => setDestination((old) => ({ ...old, [field]: event.target.value }));
  const [form, setForm] = useState(() => ({
    nickname: player.nickname || "", alliance: player.alliance || "", tier: player.tier || "T14",
    troopType: player.troopType || "fighter", marchSize: player.marchSize || 0,
    rallySize: player.rallySize || 0, captain: player.captain === true,
  }));
  const set = (field) => (event) => setForm((old) => ({ ...old, [field]: event.target.value }));
  const checkbox = (event) => setForm((old) => ({ ...old, captain: event.target.checked }));
  return (
    <Modal open title={labels.editTitle} subtitle={labels.planOnly} width="720px"
      className="turret-player-modal" onClose={onClose} closeLabel={labels.close}
      footer={<div className="turret-player-modal__actions">
        <button type="button" className="admin-secondary-button" onClick={onClose}>{labels.cancel}</button>
        <button type="button" className="admin-secondary-button" onClick={release}>{a.distribution.status.toReserve}</button>
        <button type="button" className="admin-primary-button" onClick={save}>{labels.savePlayer}</button>
      </div>}>
      <section className="turret-player-modal__destination">
        <strong>{labels.location}</strong>
        <div className="turret-player-modal__destination-fields">
          <label className="admin-field"><span>{a.distribution.turret.shifts}</span>
            <select value={destination.shift} onChange={changeDestination("shift")}>
              {activeShifts.map((key) => <option key={key} value={key}>{a.shifts[key]}</option>)}
            </select></label>
          <label className="admin-field"><span>{a.distribution.columns.turret}</span>
            <select value={destination.tower} onChange={changeDestination("tower")}>
              {TURRET_IDS.map((key) => <option key={key} value={key}>{a.distribution.towers[key]}</option>)}
            </select></label>
          <label className="admin-field"><span>{labels.role}</span>
            <select value={destination.role} onChange={changeDestination("role")}>
              <option value="captain">{a.distribution.turret.captain}</option>
              <option value="helper">{a.distribution.manual.helper}</option>
            </select></label>
        </div>
      </section>
      {error && <p className="turret-player-modal__error" role="alert">{error}</p>}
      <div className="turret-player-modal__grid">
        <label className="admin-field"><span>{labels.nickname}</span><input value={form.nickname} maxLength="90" onChange={set("nickname")} /></label>
        <label className="admin-field"><span>{a.distribution.columns.alliance}</span><input value={form.alliance} maxLength="80" onChange={set("alliance")} /></label>
        <label className="admin-field"><span>{a.distribution.columns.tier}</span>
          <select value={form.tier} onChange={set("tier")}>
            {[...REGISTRATION_TIERS].reverse().filter((tier) => !availableTiers || availableTiers[tier] || tier === player.tier)
              .map((tier) => <option value={tier} key={tier}>{tier}</option>)}
          </select></label>
        <label className="admin-field"><span>{labels.troopType}</span>
          <select value={form.troopType} onChange={set("troopType")}>
            {Object.entries(a.troops).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
          </select></label>
        <label className="admin-field"><span>{a.distribution.columns.march}</span>
          <input type="number" min="1" max="10000000" value={form.marchSize} onChange={set("marchSize")} /></label>
        <label className="admin-field"><span>{a.distribution.turret.rally}</span>
          <input type="number" min="0" max="20000000" value={form.rallySize} onChange={set("rallySize")} /></label>
        <label className="turret-player-modal__check"><input type="checkbox" checked={form.captain} onChange={checkbox} /> {labels.captainReady}</label>
      </div>
    </Modal>
  );
}
export default TurretPlayerEditModal;
