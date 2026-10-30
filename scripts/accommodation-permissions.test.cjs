/* global __dirname */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Module } = require("node:module");
const ts = require("typescript");

// Test the production UI eligibility policy in memory, without an Expo runtime,
// real accounts, API mutations or assumptions about server authorization/quota.
const helperPath = path.join(__dirname, "../src/utils/accommodation-permissions.ts");
const compiled = ts.transpileModule(fs.readFileSync(helperPath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const helperModule = new Module(helperPath, module);
helperModule._compile(compiled.outputText, helperPath);
const { getAccommodationAccess } = helperModule.exports;

test("guests and non-account values cannot view mine or create", () => {
  for (const user of [null, undefined, false, 0, "pro", [], ["pro"]]) {
    assert.deepEqual(getAccommodationAccess(user), {
      isAuthenticated: false,
      isLandlord: false,
      currentPlan: "",
      hasPostingPlan: false,
      canViewMine: false,
      canCreate: false,
      reason: "login",
    });
  }
});

test("canonical Plus and Pro plans allow creation only with a true landlord flag", () => {
  for (const currentPlan of ["plus", "pro", " PLUS ", "  pRo  "]) {
    const access = getAccommodationAccess({ id: "owner-a", isLandlord: true, currentPlan });
    assert.equal(access.isAuthenticated, true);
    assert.equal(access.isLandlord, true);
    assert.equal(access.currentPlan, currentPlan.trim().toLowerCase());
    assert.equal(access.hasPostingPlan, true);
    assert.equal(access.canViewMine, true);
    assert.equal(access.canCreate, true);
    assert.equal(access.reason, null);
  }
});

test("a paid non-landlord may read own records but cannot create", () => {
  const access = getAccommodationAccess({ id: "reader", isLandlord: false, currentPlan: "pro" });
  assert.equal(access.hasPostingPlan, true);
  assert.equal(access.canViewMine, true);
  assert.equal(access.canCreate, false);
  assert.equal(access.reason, "landlord");
});

test("a Basic or downgraded landlord keeps mine access without creation rights", () => {
  for (const currentPlan of ["basic", "", undefined]) {
    const access = getAccommodationAccess({ id: "owner-a", isLandlord: true, currentPlan });
    assert.equal(access.isLandlord, true);
    assert.equal(access.hasPostingPlan, false);
    assert.equal(access.canViewMine, true);
    assert.equal(access.canCreate, false);
    assert.equal(access.reason, "plan");
  }
});

test("truthy strings, numbers and objects cannot impersonate the landlord boolean", () => {
  for (const isLandlord of [undefined, null, false, "true", "false", 1, {}, []]) {
    const access = getAccommodationAccess({ isLandlord, currentPlan: "plus" });
    assert.equal(access.isLandlord, false);
    assert.equal(access.canCreate, false);
    assert.equal(access.reason, "landlord");
  }
});

test("substring matches and non-string plan values do not grant posting rights", () => {
  for (const currentPlan of ["professional", "pro-plan", "not-pro", "plus annual", "enterprise",
    "basic", "", null, true, 2, ["pro"], { tier: "pro" }]) {
    const access = getAccommodationAccess({ isLandlord: true, currentPlan });
    assert.equal(access.hasPostingPlan, false);
    assert.equal(access.canCreate, false);
    assert.equal(access.reason, "plan");
  }
});

test("alternative plan fields and serialized provider names never bypass currentPlan", () => {
  for (const alternatives of [
    { plan: "plus" }, { tier: "pro" }, { package: "pro" }, { role: "pro" },
    { subscriptionType: "plus" },
    { subscription: { tier: "pro", provider: "momo" } },
  ]) {
    const access = getAccommodationAccess({ isLandlord: true, ...alternatives });
    assert.equal(access.hasPostingPlan, false);
    assert.equal(access.canCreate, false);
  }
  assert.equal(getAccommodationAccess({
    isLandlord: true, currentPlan: "basic", plan: "pro", subscription: { tier: "plus" },
  }).canCreate, false);
  assert.equal(getAccommodationAccess({ isLandlord: true, currentPlan: "pro", plan: "basic" }).canCreate, true);
});

test("roles neither bypass missing flags nor revoke explicitly supplied eligibility", () => {
  for (const role of ["user", "landlord", "admin", "pro"]) {
    assert.equal(getAccommodationAccess({ role, currentPlan: "pro" }).canCreate, false);
    assert.equal(getAccommodationAccess({ role, isLandlord: true, currentPlan: "basic" }).canCreate, false);
    assert.equal(getAccommodationAccess({ role, isLandlord: true, currentPlan: "pro" }).canCreate, true);
  }
});

test("blocking reasons identify the next missing requirement in a stable order", () => {
  assert.equal(getAccommodationAccess(null).reason, "login");
  assert.equal(getAccommodationAccess({ currentPlan: "basic" }).reason, "landlord");
  assert.equal(getAccommodationAccess({ isLandlord: true, currentPlan: "basic" }).reason, "plan");
  assert.equal(getAccommodationAccess({ isLandlord: true, currentPlan: "plus" }).reason, null);
});

test("normalizing eligibility never mutates the authenticated account snapshot", () => {
  const account = Object.freeze({ id: "owner-a", isLandlord: true, currentPlan: " PRO " });
  assert.equal(getAccommodationAccess(account).currentPlan, "pro");
  assert.equal(account.currentPlan, " PRO ");
  assert.deepEqual(account, { id: "owner-a", isLandlord: true, currentPlan: " PRO " });
});
