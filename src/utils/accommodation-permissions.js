// UI eligibility only. Every request still uses the signed-in user's token;
// the API remains responsible for ownership, quota and final authorization.
export function getAccommodationAccess(user) {
  const account =
    user !== null && typeof user === "object" && !Array.isArray(user)
      ? user
      : null;
  const isAuthenticated = account !== null;
  const isLandlord = account?.isLandlord === true;
  const currentPlan =
    typeof account?.currentPlan === "string"
      ? account.currentPlan.trim().toLowerCase()
      : "";
  const hasPostingPlan = currentPlan === "plus" || currentPlan === "pro";
  const canCreate = isAuthenticated && isLandlord && hasPostingPlan;
  const reason = !isAuthenticated
    ? "login"
    : !isLandlord
      ? "landlord"
      : !hasPostingPlan
        ? "plan"
        : null;
  return {
    isAuthenticated,
    isLandlord,
    currentPlan,
    hasPostingPlan,
    // Reading one's own records is separate from permission to create more.
    // /accommodations/mine must still filter and authorize on the server.
    canViewMine: isAuthenticated,
    canCreate,
    reason,
  };
}
