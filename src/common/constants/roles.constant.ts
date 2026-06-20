/**
 * Canonical role ids — these MUST match the seeded `roles` table and the
 * frontend's understanding of the same numbers.
 */
export enum RoleId {
  Admin = 1,
  Seller = 2,
  Buyer = 3,
  SellerBuyer = 4,
}

export const ROLE_NAMES: Record<RoleId, string> = {
  [RoleId.Admin]: 'admin',
  [RoleId.Seller]: 'seller',
  [RoleId.Buyer]: 'buyer',
  [RoleId.SellerBuyer]: 'seller+buyer',
};

/** Access sets for the RolesGuard. "seller+buyer" satisfies both. */
export const SELLER_ACCESS = [RoleId.Seller, RoleId.SellerBuyer];
export const BUYER_ACCESS = [RoleId.Buyer, RoleId.SellerBuyer];
export const ADMIN_ACCESS = [RoleId.Admin];

/** Choice sent by the role-selection screen → role id. */
export type RoleChoice = 'buyer' | 'seller' | 'both';
export const ROLE_CHOICE_TO_ID: Record<RoleChoice, RoleId> = {
  buyer: RoleId.Buyer,
  seller: RoleId.Seller,
  both: RoleId.SellerBuyer,
};
