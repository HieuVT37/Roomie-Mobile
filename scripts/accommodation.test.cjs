/* global __dirname */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Module } = require("node:module");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 };
const helperPath = path.join(root, "src/utils/accommodation-form.ts");
const helperModule = new Module(helperPath, module);
helperModule._compile(ts.transpileModule(fs.readFileSync(helperPath, "utf8"), {
  compilerOptions,
}).outputText, helperPath);
const {
  EMPTY_ACCOMMODATION_FORM,
  parseRentAmount,
  validateAccommodationForm,
  buildAccommodationPayload,
  accommodationErrorMessage,
} = helperModule.exports;

// Execute the actual handler initializer, not a rewritten version of its logic.
// These isolated behavior tests do not render React Native or verify a real API.
function productionHandler(relativePath, name, bindings) {
  const filename = path.join(root, relativePath);
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
      && node.name.text === name && node.initializer && ts.isArrowFunction(node.initializer)) {
      matches.push(node.initializer);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(matches.length, 1, `Expected one production handler named ${name}`);
  const factory = `(function(${Object.keys(bindings).join(",")}) {
    return ${matches[0].getText(source)};
  })`;
  const compiled = ts.transpileModule(factory, { compilerOptions }).outputText;
  return vm.runInNewContext(compiled, {}, { filename, timeout: 1000 })(...Object.values(bindings));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((success, failure) => { resolve = success; reject = failure; });
  return { promise, resolve, reject };
}

const validValues = () => ({
  ...EMPTY_ACCOMMODATION_FORM,
  title: "  Phòng trọ Triều Khúc  ",
  address: "  Số 12, Triều Khúc, Hà Nội  ",
  price: "3.500.000",
  description: "  Có cửa sổ  ",
  contact: "  Zalo / SĐT: 0900000000  ",
});

function formHarness(values, api = async () => ({}), onSuccess = () => {}) {
  const state = { errors: {}, submitError: "", saving: false, saves: [], successes: 0, dismisses: 0 };
  const requests = [];
  const submitting = { current: false };
  const mounted = { current: true };
  const submit = productionHandler("src/components/accommodation/CreateAccommodationForm.tsx", "submit", {
    values, submitting, mounted, validateAccommodationForm, buildAccommodationPayload, accommodationErrorMessage,
    setErrors: (value) => { state.errors = value; },
    setSubmitError: (value) => { state.submitError = value; },
    setSaving: (value) => { state.saving = value; state.saves.push(value); },
    Keyboard: { dismiss: () => { state.dismisses += 1; } },
    createAccommodationApi: (payload) => { requests.push(payload); return api(payload); },
    onSuccess: () => { state.successes += 1; onSuccess(); },
  });
  return { submit, state, requests, submitting, mounted };
}

function screenHarness() {
  const state = { text: "Cầu Giấy", q: "Cầu Giấy", tab: "create", refreshKey: 2, success: null };
  const events = [];
  const bindings = {
    userKey: "user-a",
    setText: (value) => { state.text = value; },
    setQ: (value) => { state.q = value; },
    setTab: (value) => { state.tab = value; },
    setSuccess: (value) => { state.success = value; },
    setRefreshKey: (value) => { state.refreshKey = typeof value === "function" ? value(state.refreshKey) : value; },
    scrollToTop: () => events.push("scroll"),
    Keyboard: { dismiss: () => events.push("dismiss") },
  };
  const handlers = Object.fromEntries(["clearSearch", "changeSearchText", "created"].map((name) => [
    name, productionHandler("src/app/(tabs)/index.tsx", name, bindings),
  ]));
  return { state, events, ...handlers };
}

test("rent accepts blank, zero, plain digits and consistently grouped thousands", () => {
  for (const [input, expected] of [["", 0], ["  ", 0], ["0", 0], ["3500000", 3500000],
    ["3.500.000", 3500000], ["3,500,000", 3500000], [" 3\u00a0500 000 ", 3500000],
    [String(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER]]) {
    assert.equal(parseRentAmount(input), expected, input);
  }
});

test("rent rejects negative, decimal, exponent, nonfinite and malformed grouped values", () => {
  for (const input of ["-1", "+100", "3.5", "3,5", "1e6", "Infinity", "NaN", "1.00.000",
    "1,000.000", "12.3456", "abc", "9007199254740992"]) {
    assert.equal(parseRentAmount(input), null, input);
  }
});

test("only title and address are required; price must be valid when supplied", () => {
  const errors = validateAccommodationForm({ ...EMPTY_ACCOMMODATION_FORM, title: "  ", price: "-1" });
  assert.deepEqual(Object.keys(errors).sort(), ["address", "price", "title"]);
  assert.deepEqual(validateAccommodationForm({ ...validValues(), price: "", description: "", contact: "" }), {});
});

test("payload preserves the five-field contract, trims strings and keeps blank price as zero", () => {
  const values = validValues();
  const original = { ...values };
  assert.deepEqual(buildAccommodationPayload(values), {
    title: "Phòng trọ Triều Khúc", address: "Số 12, Triều Khúc, Hà Nội", price: 3500000,
    description: "Có cửa sổ", contact: "Zalo / SĐT: 0900000000",
  });
  assert.equal(buildAccommodationPayload({ ...values, price: "" }).price, 0);
  assert.deepEqual(values, original);
  assert.throws(() => buildAccommodationPayload({ ...values, address: " " }));
  assert.throws(() => buildAccommodationPayload({ ...values, price: "Infinity" }));
});

test("API errors use the server message or valid field messages without exposing arbitrary objects", () => {
  assert.equal(accommodationErrorMessage({ response: { data: { message: "Không thể lưu", errors: [{ message: "Chi tiết" }] } } }), "Không thể lưu");
  assert.equal(accommodationErrorMessage({ response: { data: { message: " ", errors: [
    null, { message: "Thiếu địa chỉ" }, { message: 123 }, { message: " " }, { message: "Giá không hợp lệ" },
  ] } } }), "Thiếu địa chỉ\nGiá không hợp lệ");
  for (const error of [null, undefined, {}, { response: { data: { message: { private: "value" } } } }]) {
    assert.equal(accommodationErrorMessage(error, "Thử lại"), "Thử lại");
  }
});

test("network and timeout failures produce actionable messages", () => {
  for (const code of ["ECONNABORTED", "ETIMEDOUT"]) {
    assert.match(accommodationErrorMessage({ code }), /phản hồi chậm/);
  }
  assert.match(accommodationErrorMessage({ code: "ERR_NETWORK" }), /kết nối/);
});

test("authorization errors preserve server details or provide a clear fallback without assuming quota", () => {
  assert.match(accommodationErrorMessage({ response: { status: 401 } }), /đăng nhập lại/);
  assert.match(accommodationErrorMessage({ response: { status: 403 } }), /quyền tài khoản/);
  assert.equal(accommodationErrorMessage({ response: { status: 403, data: { message: "Đã đạt giới hạn đăng tin" } } }), "Đã đạt giới hạn đăng tin");
});

test("invalid form shows errors and never posts or enters saving state", async () => {
  const form = formHarness({ ...EMPTY_ACCOMMODATION_FORM, price: "-1" });
  await form.submit();
  assert.equal(form.requests.length, 0);
  assert.deepEqual(Object.keys(form.state.errors).sort(), ["address", "price", "title"]);
  assert.equal(form.state.saving, false);
  assert.equal(form.state.dismisses, 0);
  assert.equal(form.state.successes, 0);
});

test("two immediate submissions make one API request until the first settles", async () => {
  const pending = deferred();
  const form = formHarness(validValues(), () => pending.promise);
  const first = form.submit();
  await form.submit();
  assert.equal(form.requests.length, 1);
  assert.equal(form.state.saving, true);
  assert.equal(form.submitting.current, true);
  assert.equal(form.state.dismisses, 1);
  pending.resolve({});
  await first;
  assert.deepEqual(form.state.saves, [true, false]);
  assert.equal(form.submitting.current, false);
});

test("API rejection preserves input, displays the error and unlocks a later retry", async () => {
  const values = validValues();
  const original = { ...values };
  const form = formHarness(values, async () => { throw { response: { data: { message: "Không lưu được bài" } } }; });
  await form.submit();
  assert.deepEqual(values, original);
  assert.equal(form.state.submitError, "Không lưu được bài");
  assert.equal(form.state.saving, false);
  assert.equal(form.submitting.current, false);
  assert.equal(form.state.successes, 0);
  await form.submit();
  assert.equal(form.requests.length, 2);
});

test("successful submission invokes the real parent handler to show mine and invalidate its list", async () => {
  const screen = screenHarness();
  const form = formHarness(validValues(), async () => ({}), screen.created);
  await form.submit();
  assert.equal(form.requests.length, 1);
  assert.equal(form.state.successes, 1);
  assert.equal(screen.state.tab, "mine");
  assert.equal(screen.state.refreshKey, 3);
  assert.equal(screen.state.success.ownerKey, "user-a");
  assert.match(screen.state.success.message, /thành công/);
  assert.equal(form.state.saving, false);
});

test("late success or failure after unmount cannot navigate or update form state", async () => {
  for (const outcome of ["resolve", "reject"]) {
    const pending = deferred();
    const form = formHarness(validValues(), () => pending.promise);
    const request = form.submit();
    form.mounted.current = false;
    if (outcome === "resolve") pending.resolve({});
    else pending.reject(new Error("offline"));
    await request;
    assert.equal(form.state.successes, 0);
    assert.equal(form.state.submitError, "");
    assert.deepEqual(form.state.saves, [true]);
    assert.equal(form.submitting.current, false);
  }
});

test("clear search resets visible and applied text, scrolls up and dismisses the keyboard", () => {
  const screen = screenHarness();
  screen.clearSearch();
  assert.equal(screen.state.text, "");
  assert.equal(screen.state.q, "");
  assert.deepEqual(screen.events, ["scroll", "dismiss"]);
});

test("manual empty or whitespace input clears the applied query; typing waits for submit", () => {
  for (const input of ["", "  "]) {
    const screen = screenHarness();
    screen.changeSearchText(input);
    assert.equal(screen.state.text, input);
    assert.equal(screen.state.q, "");
    assert.deepEqual(screen.events, ["scroll"]);
  }
  const screen = screenHarness();
  screen.changeSearchText("Thanh Xuân");
  assert.equal(screen.state.text, "Thanh Xuân");
  assert.equal(screen.state.q, "Cầu Giấy");
  assert.deepEqual(screen.events, []);
});
