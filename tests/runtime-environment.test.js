import test from "node:test";
import assert from "node:assert/strict";

import {
  isLocalhostHostname,
  shouldRegisterServiceWorker
} from "../src/data/runtime-environment.js";

test("isLocalhostHostname recognizes loopback hosts", () => {
  assert.equal(isLocalhostHostname("localhost"), true);
  assert.equal(isLocalhostHostname("127.0.0.1"), true);
  assert.equal(isLocalhostHostname("::1"), true);
  assert.equal(isLocalhostHostname("tap-hifz.pages.dev"), false);
});

test("shouldRegisterServiceWorker skips localhost but allows deployed hosts", () => {
  assert.equal(shouldRegisterServiceWorker("localhost"), false);
  assert.equal(shouldRegisterServiceWorker("127.0.0.1"), false);
  assert.equal(shouldRegisterServiceWorker("tap-hifz.pages.dev"), true);
});
