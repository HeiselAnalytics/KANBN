// @vitest-environment jsdom

import { fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useDismissableLayer } from "@/components/use-dismissable-layer";

function LayerFixture() {
  const [open, setOpen] = useState(true);
  const layerRef = useDismissableLayer<HTMLDivElement>(open, () => setOpen(false));
  return <div><button>Outside</button>{open && <div ref={layerRef}><button>Inside</button><span>Panel</span></div>}</div>;
}

describe("useDismissableLayer", () => {
  it("keeps the layer open for inside clicks and closes it outside", () => {
    const view = render(<LayerFixture />);
    fireEvent.pointerDown(view.getByText("Inside"));
    expect(view.getByText("Panel")).toBeTruthy();
    fireEvent.pointerDown(view.getByText("Outside"));
    expect(view.queryByText("Panel")).toBeNull();
  });

  it("closes the layer with Escape", () => {
    const view = render(<LayerFixture />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(view.queryByText("Panel")).toBeNull();
  });
});
