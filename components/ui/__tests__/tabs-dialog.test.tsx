import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogBody, DialogHeader } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";

describe("tabs", () => {
  const items = [
    { id: "kenya", label: "Kenya", content: "Mara content" },
    { id: "tanzania", label: "Tanzania", content: "Serengeti content" },
  ];

  it("switches panels on click", () => {
    render(<Tabs items={items} />);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Mara content");
    fireEvent.click(screen.getByRole("tab", { name: "Tanzania" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Serengeti content");
    expect(screen.getByRole("tab", { name: "Tanzania" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("moves with arrow keys", () => {
    render(<Tabs items={items} />);
    const kenya = screen.getByRole("tab", { name: "Kenya" });
    kenya.focus();
    fireEvent.keyDown(kenya, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Tanzania" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("dialog", () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        <Dialog open={open} onClose={() => setOpen(false)} labelledBy="demo-title">
          <DialogHeader id="demo-title" title="Demo" onClose={() => setOpen(false)} />
          <DialogBody>Dialog content</DialogBody>
        </Dialog>
      </>
    );
  }

  it("opens and closes with labelled heading", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Demo" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
