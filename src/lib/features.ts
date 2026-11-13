/**
 * Loyalty card kill switch. While false:
 *  - the portal hides the loyalty tab, the Linktree loyalty module row and preview;
 *  - /portal/<id>/loyalty redirects to /portal/<id>;
 *  - the portal actions updateLoyaltyEnabled (enabling) and updateLoyaltySettings are refused;
 *  - createLocation stores has_loyalty_enabled=false for new locations;
 *  - PUT /api/admin/locations refuses has_loyalty_enabled=true;
 *  - the admin checkbox in LocationEditForm is disabled.
 * Set to true to restore everything (editor code and translations are untouched).
 */
export const LOYALTY_ENABLED = false;
