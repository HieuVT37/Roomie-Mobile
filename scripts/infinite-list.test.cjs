/* global __dirname */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Module } = require("node:module");
const ts = require("typescript");

// Use the project's existing TypeScript compiler in memory. No test runner,
// generated files, Expo runtime or network service is needed for these tests.
const helperPath = path.join(__dirname, "../src/hooks/infinite-list-utils.ts");
const compiled = ts.transpileModule(fs.readFileSync(helperPath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const helperModule = new Module(helperPath, module);
helperModule._compile(compiled.outputText, helperPath);
const {
  ListResponseError,
  normalizeListResponse,
  mergeListItems,
  listItemKey,
  sameListScope,
  createListRequestGate,
  runListRequest,
} = helperModule.exports;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((success, failure) => {
    resolve = success;
    reject = failure;
  });
  return { promise, resolve, reject };
}

function recordingHandlers(events, label) {
  return {
    resolve: (value) => events.push([label, "resolve", value]),
    reject: (error) => events.push([label, "reject", error.message]),
    settled: () => events.push([label, "settled"]),
  };
}

test("plain arrays and unpaginated mine responses become one page", () => {
  const items = [{ _id: "mine-1" }];
  assert.deepEqual(normalizeListResponse(items), { items, page: 1, pages: 1 });
  assert.deepEqual(normalizeListResponse({ items }), { items, page: 1, pages: 1 });
  assert.deepEqual(normalizeListResponse({ data: { items } }), { items, page: 1, pages: 1 });
  assert.deepEqual(normalizeListResponse([]), { items: [], page: 1, pages: 1 });
});

test("pagination metadata is normalized, including an empty server result", () => {
  assert.deepEqual(normalizeListResponse({ items: [], page: "2", pages: "4" }, 2), {
    items: [], page: 2, pages: 4,
  });
  assert.deepEqual(normalizeListResponse({ items: [], page: 1, pages: 0 }), {
    items: [], page: 1, pages: 1,
  });
});

test("malformed responses are errors rather than empty successful lists", () => {
  for (const value of [null, {}, { data: {} }, { items: null }, { items: [null] },
    { items: ["text"] }, { items: [], pages: -1 }, { items: [], page: "NaN", pages: 2 },
    { items: "wrong", data: [] }]) {
    assert.throws(() => normalizeListResponse(value), ListResponseError);
  }
});

test("load-more rejects repeated or unpaginated responses instead of looping the same page", () => {
  const items = [{ id: "first-page" }];
  assert.throws(() => normalizeListResponse({ items, page: 1, pages: 3 }, 2), ListResponseError);
  assert.throws(() => normalizeListResponse({ items, page: 3, pages: 3 }, 2), ListResponseError);
  assert.throws(() => normalizeListResponse({ items }, 2), ListResponseError);
  assert.throws(() => normalizeListResponse(items, 2), ListResponseError);
  assert.deepEqual(normalizeListResponse({ items: [], page: 2, pages: 3 }, 2), {
    items: [], page: 2, pages: 3,
  });
});

test("stable IDs deduplicate within and across pages without dropping missing IDs", () => {
  const first = [{ id: "1" }, { _id: "2" }, { userId: "3" }, { title: "no-id-a" }];
  const next = [{ _id: "1" }, { id: 2 }, { userId: "3" }, { _id: "4" },
    { _id: "4" }, { title: "no-id-b" }];
  assert.deepEqual(mergeListItems(first, next), [
    ...first, { _id: "4" }, { title: "no-id-b" },
  ]);
  assert.equal(listItemKey({ id: "", _id: "fallback" }), "fallback");
  assert.equal(listItemKey({ id: 0 }), "0");
});

test("scope comparison detects filters, sessions, refresh keys and length changes", () => {
  assert.equal(sameListScope(["q", "mine", "user-a", 1], ["q", "mine", "user-a", 1]), true);
  assert.equal(sameListScope(["q", "mine", "user-a", 1], ["q", "mine", "user-b", 1]), false);
  assert.equal(sameListScope(["q", "mine", "user-a", 1], ["q", "mine", "user-a", 2]), false);
  assert.equal(sameListScope(["q"], ["q", "mine"]), false);
});

test("a refresh request prevents an overlapping load-more request", async () => {
  const gate = createListRequestGate();
  const pending = deferred();
  const events = [];
  const refresh = runListRequest(gate, () => pending.promise, recordingHandlers(events, "refresh"));
  let loadMoreCalls = 0;
  await runListRequest(gate, async () => { loadMoreCalls += 1; }, recordingHandlers(events, "more"));
  assert.equal(loadMoreCalls, 0);
  assert.equal(gate.isBusy(), true);
  pending.resolve("page-one");
  await refresh;
  assert.deepEqual(events, [["refresh", "resolve", "page-one"], ["refresh", "settled"]]);
  assert.equal(gate.isBusy(), false);
});

test("late success and finally from a previous session cannot update or finish a new request", async () => {
  const gate = createListRequestGate();
  const oldPage = deferred();
  const newPage = deferred();
  const events = [];
  const oldRequest = runListRequest(gate, () => oldPage.promise, recordingHandlers(events, "old-user"));
  gate.invalidate();
  const newRequest = runListRequest(gate, () => newPage.promise, recordingHandlers(events, "new-user"));
  oldPage.resolve("old-private-records");
  await oldRequest;
  assert.deepEqual(events, []);
  assert.equal(gate.isBusy(), true);
  newPage.resolve("new-records");
  await newRequest;
  assert.deepEqual(events, [["new-user", "resolve", "new-records"], ["new-user", "settled"]]);
  assert.equal(gate.isBusy(), false);
});

test("late errors after disable/unmount are ignored, including finally", async () => {
  const gate = createListRequestGate();
  const pending = deferred();
  const events = [];
  const request = runListRequest(gate, () => pending.promise, recordingHandlers(events, "disabled"));
  gate.invalidate();
  pending.reject(new Error("network failure"));
  await request;
  assert.deepEqual(events, []);
  assert.equal(gate.isBusy(), false);
});

test("a failed refresh reports the error without replacing existing items", async () => {
  const gate = createListRequestGate();
  const items = [{ id: "already-loaded" }];
  let currentItems = items;
  let error = "";
  let refreshing = true;
  await runListRequest(gate, async () => { throw new Error("offline"); }, {
    resolve: (value) => { currentItems = normalizeListResponse(value).items; },
    reject: (failure) => { error = failure.message; },
    settled: () => { refreshing = false; },
  });
  assert.equal(currentItems, items);
  assert.equal(error, "offline");
  assert.equal(refreshing, false);
  assert.equal(gate.isBusy(), false);
});

test("invalid server data uses the error path and unlocks the next retry", async () => {
  const gate = createListRequestGate();
  let error;
  let settled = 0;
  await runListRequest(gate, async () => ({}), {
    resolve: normalizeListResponse,
    reject: (failure) => { error = failure; },
    settled: () => { settled += 1; },
  });
  assert.ok(error instanceof ListResponseError);
  assert.equal(settled, 1);
  assert.equal(gate.isBusy(), false);
  const events = [];
  await runListRequest(gate, async () => [], recordingHandlers(events, "retry"));
  assert.deepEqual(events, [["retry", "resolve", []], ["retry", "settled"]]);
});
