import { describe, it, expect } from "vitest";
import * as pkg from "../src/index.js";
import * as errors from "../src/types/errors.js";

/**
 * Every error class the package exports. Removing or renaming one is a
 * breaking change for users who import it or check `err.name`, so update
 * this list (and the CHANGELOG) on purpose, never by accident.
 */
const EXPECTED_ERRORS = [
  "MinifetchError",
  "InvalidUrlError",
  "RobotsBlockedError",
  "PaymentFailedError",
  "ExtractionFailedError",
  "ConfigurationError",
  "NetworkError",
  "InvalidQueryError",
  "SearchFailedError",
];

/** Names of the Error classes defined in src/types/errors.ts. */
const definedErrors = Object.entries(errors)
  .filter(([, value]) => typeof value === "function" && value.prototype instanceof Error)
  .map(([name]) => name);

describe("error exports", () => {
  it("errors.ts defines exactly the expected error classes", () => {
    expect(definedErrors.sort()).toEqual([...EXPECTED_ERRORS].sort());
  });

  it.each(EXPECTED_ERRORS)("%s is exported from the package index", name => {
    expect((pkg as Record<string, unknown>)[name]).toBe((errors as Record<string, unknown>)[name]);
  });

  it.each(EXPECTED_ERRORS)("%s extends MinifetchError and sets err.name", name => {
    const ErrorClass = (errors as Record<string, any>)[name];
    const err = new ErrorClass("x", "y");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(pkg.MinifetchError);
    expect(err).toBeInstanceOf(ErrorClass);
    expect(err.name).toBe(name);
  });
});
