/** Shared visibility/required semantics for both the form and Worker validation. */
export function isRegistrationFieldVisible(visibleFields, field) {
  return visibleFields?.[field] !== false;
}

export function isRegistrationFieldRequired(visibleFields, requiredFields, field) {
  return (
    isRegistrationFieldVisible(visibleFields, field) &&
    requiredFields?.[field] === true
  );
}
