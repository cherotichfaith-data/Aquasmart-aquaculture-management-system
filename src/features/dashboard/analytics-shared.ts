// EFCR analytics now live in the production feature layer.
// This barrel preserves any existing consumers without breakage.
export { computeEfcrFromProductionRows } from "@/features/production/analytics"
