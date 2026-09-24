import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "@/components/ui/calendar";
import { FieldError, FieldHint, Input, Label, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

describe("form fields", () => {
  it("associates label, input, hint and error accessibly", () => {
    render(
      <div>
        <Label htmlFor="travellers">Travellers</Label>
        <Input
          id="travellers"
          aria-describedby="travellers-hint travellers-error"
          aria-invalid="true"
        />
        <FieldHint id="travellers-hint">Adults and children</FieldHint>
        <FieldError id="travellers-error">Enter at least one traveller</FieldError>
      </div>,
    );
    const input = screen.getByLabelText("Travellers");
    expect(input).toHaveAttribute("aria-describedby", "travellers-hint travellers-error");
    expect(input).toBeInvalid();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter at least one traveller");
  });

  it("renders textarea and select", () => {
    render(
      <>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" />
        <Label htmlFor="style">Style</Label>
        <Select id="style" defaultValue="private">
          <option value="private">Private</option>
          <option value="shared">Shared</option>
        </Select>
      </>
    );
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.getByLabelText("Style")).toHaveValue("private");
  });
});

describe("calendar", () => {
  it("selects a date and reports it", () => {
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState<Date | undefined>(new Date(2026, 8, 1));
      return (
        <>
          <h2 id="travel-dates">Travel dates</h2>
          <Calendar
            labelledBy="travel-dates"
            value={value}
            min={new Date(2026, 8, 1)}
            onChange={(date) => {
              setValue(date);
              onChange(date);
            }}
          />
        </>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("gridcell", { name: /15 September 2026/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toBeInstanceOf(Date);
  });
});
