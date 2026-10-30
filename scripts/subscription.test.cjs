/* global __dirname */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Run the real confirmation/request callback with HTTP/session/Alert mocks.
// This does not send a payment or establish the server's subscription contract.
function harness(options = {}) {
  const user = options.guest ? null : { id: "a", currentPlan: "basic", isLandlord: true };
  const activeUser = { current: user };
  const mounted = { current: true };
  const submitting = { current: false };
  const alerts = [];
  const posts = [];
  const refreshes = [];
  const states = [];
  const filename = path.join(__dirname, "../src/app/account/subscription.tsx");
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
      && node.name.text === "handleSelectPlan") callbacks.push(node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(callbacks.length, 1);
  const bindings = {
    user, activeUser, mounted, submitting,
    currentPlanKey: "basic", currentLevel: 0,
    PLAN_LEVELS: { basic: 0, plus: 1, pro: 2 },
    userKey: (account) => String(account?.id ?? ""),
    Alert: { alert: (...args) => alerts.push(args) },
    setSubmittingPlan: (value) => states.push(value),
    api: { post: async (...args) => { posts.push(args); return options.post?.(...args); } },
    refreshSession: async (settings) => {
      refreshes.push(settings);
      return options.refresh ? options.refresh(settings) : { user: activeUser.current };
    },
  };
  const compiled = ts.transpileModule(
    `(function(${Object.keys(bindings).join(",")}) { return ${callbacks[0].getText(source)}; })`,
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const select = vm.runInNewContext(compiled, {}, { filename, timeout: 1000 })(...Object.values(bindings));
  const confirm = () => {
    const buttons = alerts.find((entry) => Array.isArray(entry[2]))?.[2];
    assert.ok(buttons, "Expected a confirmation dialog");
    return buttons.find((button) => button.onPress).onPress();
  };
  return { user, activeUser, mounted, submitting, alerts, posts, refreshes, states, select, confirm };
}

test("guest cannot submit a subscription request", () => {
  const app = harness({ guest: true });
  app.select("plus");
  assert.equal(app.alerts[0][0], "Cần đăng nhập");
  assert.equal(app.posts.length, 0);
});

test("failed subscription POST shows failure without claiming an upgrade or refreshing", async () => {
  const app = harness({ post: async () => { throw { response: { data: { message: "Không được phép" } } }; } });
  app.select("plus");
  await app.confirm();
  assert.equal(app.alerts.length, 2);
  assert.equal(app.alerts[1][0], "Không gửi được yêu cầu");
  assert.equal(app.alerts[1][1], "Không được phép");
  assert.equal(app.refreshes.length, 0);
  assert.equal(app.user.currentPlan, "basic");
  assert.deepEqual(app.states, ["plus", null]);
});

test("accepted request keeps the existing endpoint and forces a fresh canonical session", async () => {
  const app = harness();
  app.select("plus");
  await app.confirm();
  assert.equal(app.posts.length, 1);
  assert.equal(app.posts[0][0], "/subscriptions/subscribe");
  assert.deepEqual(JSON.parse(JSON.stringify(app.posts[0][1])), { plan: "plus" });
  assert.equal(app.refreshes.length, 1);
  assert.equal(app.refreshes[0].force, true);
  assert.equal(app.user.currentPlan, "basic", "HTTP success must not grant rights locally");
  assert.equal(app.alerts[1][0], "Yêu cầu đã được tiếp nhận");
});

test("refresh failure after accepted request asks the user to recheck rather than claiming activation", async () => {
  const app = harness({ refresh: async () => { throw new Error("offline"); } });
  app.select("plus");
  await app.confirm();
  assert.equal(app.alerts[1][0], "Yêu cầu đã được tiếp nhận");
  assert.match(app.alerts[1][1], /chưa thể làm mới/);
  assert.equal(app.user.currentPlan, "basic");
});

test("duplicate confirmation while POST is pending does not send another request", async () => {
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  const app = harness({ post: () => pending });
  app.select("plus");
  const first = app.confirm();
  await app.confirm();
  assert.equal(app.posts.length, 1);
  resolve();
  await first;
  assert.equal(app.submitting.current, false);
});

test("changing account before confirming cancels the old account's request", async () => {
  const app = harness();
  app.select("plus");
  app.activeUser.current = { id: "b", currentPlan: "pro" };
  await app.confirm();
  assert.equal(app.posts.length, 0);
  assert.equal(app.refreshes.length, 0);
});

test("changing account during POST prevents stale refresh and success feedback", async () => {
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  const app = harness({ post: () => pending });
  app.select("plus");
  const request = app.confirm();
  app.activeUser.current = { id: "b", currentPlan: "pro" };
  resolve();
  await request;
  assert.equal(app.refreshes.length, 0);
  assert.equal(app.alerts.length, 1);
});
