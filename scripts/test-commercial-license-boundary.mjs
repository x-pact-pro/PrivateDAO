import assert from "node:assert/strict";

const original = process.env.PD_LICENSE_SIGNING_SECRET;
delete process.env.PD_LICENSE_SIGNING_SECRET;

try {
  const { buildCommercialSignedLicense } = await import("../apps/web/src/lib/commercial-readiness.ts");
  assert.throws(
    () => buildCommercialSignedLicense({
      organizationId: "org_boundary_test",
      licenseType: "PROFESSIONAL",
      licenseStart: "2026-01-01T00:00:00.000Z",
      licenseEnd: "2026-02-01T00:00:00.000Z",
    }),
    /Commercial license signing is not configured/,
  );
  console.log("Commercial license signing boundary: PASS");
} finally {
  if (original === undefined) delete process.env.PD_LICENSE_SIGNING_SECRET;
  else process.env.PD_LICENSE_SIGNING_SECRET = original;
}
