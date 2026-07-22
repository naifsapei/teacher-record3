import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOtpChannel, getOtpChannelLabel, getOtpDestination } from "./registrationProfile.js";

test("normalizeOtpChannel defaults to email", () => {
  assert.equal(normalizeOtpChannel(undefined), "email");
  assert.equal(normalizeOtpChannel(""), "email");
  assert.equal(normalizeOtpChannel("email"), "email");
});

test("normalizeOtpChannel accepts phone", () => {
  assert.equal(normalizeOtpChannel("phone"), "phone");
});

test("getOtpChannelLabel and getOtpDestination return the right values", () => {
  assert.equal(getOtpChannelLabel("phone"), "الجوال");
  assert.equal(getOtpDestination("phone", "teacher@example.com", "0501234567"), "0501234567");
  assert.equal(getOtpDestination("email", "teacher@example.com", "0501234567"), "teacher@example.com");
});
