import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  // Node-environment suites (no DOM) share this setup file.
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }
});
