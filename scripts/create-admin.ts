// Phase 0 placeholder. Real RBAC user bootstrap lands with auth (Phase 6/8).
// Production must never use hard-coded credentials.
const email = process.env.ADMIN_EMAIL;

if (!email) {
  console.error("Set ADMIN_EMAIL before running create-admin.");
  process.exit(1);
}

console.log(`Admin bootstrap placeholder validated for ${email}.`);
console.log("Full user creation will be implemented with the auth module.");
