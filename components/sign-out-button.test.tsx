import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignOutButton } from "@/components/sign-out-button";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("SignOutButton", () => {
  it("destroys the session then lands on the given login page", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(<SignOutButton landing="/login" />);
      fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
      expect(refresh).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
