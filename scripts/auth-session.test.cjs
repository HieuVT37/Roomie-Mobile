/* global __dirname */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Module } = require("node:module");
const ts = require("typescript");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((success, failure) => { resolve = success; reject = failure; });
  return { promise, resolve, reject };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));
const sameDeps = (left, right) => left?.length === right?.length && left.every((v, i) => Object.is(v, right[i]));

// Exercise the actual provider with deterministic hook, SecureStore and HTTP
// mocks. This tests session concurrency without a renderer, device or network.
function authHarness(initialToken = "token-a") {
  let token = initialToken;
  let cursor = 0;
  let unmounted = false;
  let updatesAfterUnmount = 0;
  let meCalls = 0;
  const slots = [];
  const effects = [];
  const env = {
    me: async () => ({ user: { id: "a", currentPlan: "basic" }, profile: { displayName: "A" } }),
    login: async () => ({ token: "token-b", user: { id: "b" }, profile: null }),
    beforeDelete: async () => {},
  };
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    useContext: () => null,
    useState(initial) {
      const position = cursor++;
      if (!(position in slots)) slots[position] = typeof initial === "function" ? initial() : initial;
      return [slots[position], (value) => {
        if (unmounted) updatesAfterUnmount += 1;
        slots[position] = typeof value === "function" ? value(slots[position]) : value;
      }];
    },
    useRef(initial) {
      const position = cursor++;
      if (!(position in slots)) slots[position] = { current: initial };
      return slots[position];
    },
    useCallback(callback, deps) {
      const position = cursor++;
      if (!slots[position] || !sameDeps(slots[position].deps, deps)) {
        slots[position] = { deps, callback };
      }
      return slots[position].callback;
    },
    useEffect(effect, deps) {
      const position = cursor++;
      if (!slots[position] || !sameDeps(slots[position].deps, deps)) {
        effects.push(() => {
          slots[position]?.cleanup?.();
          slots[position] = { deps, cleanup: effect() };
        });
      }
    },
  };
  const storage = {
    getItemAsync: async () => token,
    setItemAsync: async (_key, value) => { token = value; },
    deleteItemAsync: async () => { await env.beforeDelete(); token = null; },
  };
  const sourcePath = path.join(__dirname, "../src/auth/AuthContext.js");
  const compiled = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
    fileName: "AuthContext.tsx",
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const loaded = new Module(sourcePath, module);
  loaded.require = (name) => {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }) };
    if (name === "expo-secure-store") return storage;
    if (name === "../api/auth") return {
      meApi: () => { meCalls += 1; return env.me(); },
      loginApi: (input) => env.login(input),
    };
    return module.require(name);
  };
  loaded._compile(compiled.outputText, sourcePath);
  return Object.assign(env, {
    render() {
      cursor = 0;
      const result = loaded.exports.AuthProvider({ children: null });
      while (effects.length) effects.shift()();
      return result.props.value;
    },
    unmount() {
      unmounted = true;
      for (const slot of slots) slot?.cleanup?.();
    },
    snapshot: () => ({ token, meCalls, updatesAfterUnmount }),
  });
}

async function boot(env) {
  await env.render().refreshSession();
  await tick();
  return env.render();
}

test("bootstrap/overlapping refresh uses one GET and retains canonical user/profile", async () => {
  const env = authHarness();
  const canonical = { user: { id: "a", currentPlan: "plus", isLandlord: true }, profile: null };
  const response = deferred();
  env.me = () => response.promise;
  const context = env.render();
  const first = context.refreshSession();
  assert.equal(first, context.refreshSession());
  await tick();
  assert.equal(env.snapshot().meCalls, 1);
  response.resolve(canonical);
  assert.deepEqual(await first, canonical);
  await tick();
  const current = env.render();
  assert.equal(current.user, canonical.user);
  assert.equal(current.profile, null);
  assert.equal(current.loading, false);
  assert.equal(current.refreshSession, context.refreshSession);
});

test("refresh updates canonical fields, without toggling bootstrap loading", async () => {
  const env = authHarness();
  const context = await boot(env);
  const response = deferred();
  env.me = () => response.promise;
  const refresh = context.refreshSession();
  assert.equal(env.render().loading, false);
  const canonical = { user: { id: "a", currentPlan: "pro", isLandlord: false }, profile: { bio: "server" } };
  response.resolve(canonical);
  await refresh;
  const current = env.render();
  assert.equal(current.user, canonical.user);
  assert.equal(current.profile, canonical.profile);
  assert.equal(current.loading, false);
});

test("network failure preserves the valid current session and token", async () => {
  const env = authHarness();
  const context = await boot(env);
  env.me = async () => { throw new Error("offline"); };
  await assert.rejects(context.refreshSession(), /offline/);
  const current = env.render();
  assert.equal(current.user, context.user);
  assert.equal(current.profile, context.profile);
  assert.equal(current.loading, false);
  assert.equal(env.snapshot().token, "token-a");
});

test("forced post-mutation refresh waits for an older GET then requests a fresh canonical session", async () => {
  const env = authHarness();
  const context = await boot(env);
  const previous = deferred();
  let calls = 0;
  const canonical = { user: { id: "a", currentPlan: "pro" }, profile: null };
  env.me = () => ++calls === 1 ? previous.promise : Promise.resolve(canonical);
  const olderRefresh = context.refreshSession();
  await tick();
  const afterMutation = context.refreshSession({ force: true });
  assert.equal(calls, 1);
  previous.resolve({ user: { id: "a", currentPlan: "basic" }, profile: null });
  await olderRefresh;
  assert.deepEqual(await afterMutation, canonical);
  assert.equal(calls, 2);
  assert.equal(env.render().user.currentPlan, "pro");
});

test("current-session 401 clears local credentials and session", async () => {
  const env = authHarness();
  const context = await boot(env);
  const unauthorized = Object.assign(new Error("expired"), { response: { status: 401 } });
  env.me = async () => { throw unauthorized; };
  await assert.rejects(context.refreshSession(), (error) => error === unauthorized);
  const current = env.render();
  assert.equal(current.user, null);
  assert.equal(current.profile, null);
  assert.equal(env.snapshot().token, null);
});

test("late refresh after logout cannot restore user or profile", async () => {
  const env = authHarness();
  const context = await boot(env);
  const response = deferred();
  env.me = () => response.promise;
  const refresh = context.refreshSession();
  await tick();
  await context.logout();
  response.resolve({ user: { id: "a" }, profile: { displayName: "stale" } });
  assert.equal(await refresh, null);
  assert.equal(env.render().user, null);
  assert.equal(env.snapshot().token, null);
});

test("logout deletion still completes when an immediate new login fails", async () => {
  const env = authHarness();
  const context = await boot(env);
  env.login = async () => { throw new Error("invalid credentials"); };
  const loggingOut = context.logout();
  // Deliberately do not await logout: the new attempt changes the generation
  // before the queued SecureStore deletion gets its microtask.
  const failedLogin = assert.rejects(
    context.login("new@example.test", "mock-password"),
    /invalid credentials/,
  );
  await Promise.all([loggingOut, failedLogin]);
  const current = env.render();
  assert.equal(current.user, null);
  assert.equal(current.profile, null);
  assert.equal(env.snapshot().token, null);
});

test("late refresh from user A cannot replace user B after a new login", async () => {
  const env = authHarness();
  const context = await boot(env);
  const response = deferred();
  env.me = () => response.promise;
  const refresh = context.refreshSession();
  await tick();
  await context.login("b@example.test", "mock-password");
  response.resolve({ user: { id: "a" }, profile: null });
  assert.equal(await refresh, null);
  assert.equal(env.render().user.id, "b");
  assert.equal(env.snapshot().token, "token-b");
});

test("a 401 received after a new login cannot enqueue deletion of the new token", async () => {
  const env = authHarness();
  const context = await boot(env);
  const response = deferred();
  let deletions = 0;
  env.beforeDelete = async () => { deletions += 1; };
  env.me = () => response.promise;
  const refresh = context.refreshSession();
  await tick();
  await context.login("b@example.test", "mock-password");
  response.reject(Object.assign(new Error("expired old session"), { response: { status: 401 } }));
  assert.equal(await refresh, null);
  assert.equal(deletions, 0);
  assert.equal(env.render().user.id, "b");
  assert.equal(env.snapshot().token, "token-b");
});

test("a slow 401 token deletion finishes before a newer login writes its token", async () => {
  const env = authHarness();
  const context = await boot(env);
  const deletion = deferred();
  let deleting = false;
  env.beforeDelete = async () => { deleting = true; await deletion.promise; };
  const unauthorized = Object.assign(new Error("expired"), { response: { status: 401 } });
  env.me = async () => { throw unauthorized; };
  const refreshed = context.refreshSession();
  await tick();
  assert.equal(deleting, true);
  const login = context.login("b@example.test", "mock-password");
  await tick();
  deletion.resolve();
  const [staleSession] = await Promise.all([refreshed, login]);
  assert.equal(staleSession, null);
  assert.equal(env.render().user.id, "b");
  assert.equal(env.snapshot().token, "token-b");
});

test("an older login response cannot replace the newer successful login", async () => {
  const env = authHarness(null);
  const context = await boot(env);
  const oldResponse = deferred();
  env.login = ({ email }) => email.startsWith("old")
    ? oldResponse.promise
    : Promise.resolve({ token: "new-token", user: { id: "new" }, profile: null });
  const oldLogin = context.login("old@example.test", "mock-password");
  const oldRejected = assert.rejects(oldLogin, /Phiên đăng nhập đã thay đổi/);
  await context.login("new@example.test", "mock-password");
  oldResponse.resolve({ token: "old-token", user: { id: "old" }, profile: null });
  await oldRejected;
  assert.equal(env.render().user.id, "new");
  assert.equal(env.snapshot().token, "new-token");
});

test("malformed me data rejects without replacing an existing valid session", async () => {
  const env = authHarness();
  const context = await boot(env);
  env.me = async () => ({ user: null, profile: null });
  await assert.rejects(context.refreshSession(), /Dữ liệu phiên đăng nhập không hợp lệ/);
  assert.equal(env.render().user, context.user);
  assert.equal(env.snapshot().token, "token-a");
});

test("late refresh after provider unmount does not update state", async () => {
  const env = authHarness();
  const context = await boot(env);
  const response = deferred();
  env.me = () => response.promise;
  const refresh = context.refreshSession();
  await tick();
  env.unmount();
  response.resolve({ user: { id: "a" }, profile: null });
  assert.equal(await refresh, null);
  assert.equal(env.snapshot().updatesAfterUnmount, 0);
});
