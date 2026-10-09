function CountdownValue({ value, label }) {
  return (
    <div className="home-countdown__item">
      <strong>{String(value).padStart(2, "0")}</strong>

      <span>{label}</span>
    </div>
  );
}

export default CountdownValue;
