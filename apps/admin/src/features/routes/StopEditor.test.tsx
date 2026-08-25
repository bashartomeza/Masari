// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanonicalStop } from "../../api";
import { StopEditor } from "./StopEditor";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const activeStop: CanonicalStop = {
  id: "stop_1",
  stop_key: "ppu-main",
  service_region_key: "south-west-bank",
  name_ar: "جامعة بوليتكنك فلسطين",
  name_en: "Palestine Polytechnic University",
  latitude: 31.507316,
  longitude: 35.090893,
  status: "active"
};

describe("StopEditor", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders a focused bilingual manual-coordinate form for an active unused stop", () => {
    const markup = renderToStaticMarkup(
      <StopEditor stop={activeStop} used={false} busy={false} locale="en" onSave={vi.fn()} />
    );

    expect(markup).toContain("Arabic name");
    expect(markup).toContain("English name");
    expect(markup).toContain("Service region");
    expect(markup).toContain("Latitude");
    expect(markup).toContain("Longitude");
    expect(markup).toContain("Coordinates are supplied manually.");
    expect(markup).toMatch(/<input(?=[^>]*name="stop_key")(?=[^>]*readOnly="")[^>]*>/);
    expect(markup).toMatch(/<input(?=[^>]*name="service_region_key")(?![^>]*readOnly)[^>]*>/);
    expect(markup).toMatch(/<input(?=[^>]*name="latitude")(?=[^>]*type="number")(?=[^>]*min="-90")(?=[^>]*max="90")(?=[^>]*dir="ltr")[^>]*>/);
    expect(markup).toMatch(/<input(?=[^>]*name="longitude")(?=[^>]*type="number")(?=[^>]*min="-180")(?=[^>]*max="180")(?=[^>]*dir="ltr")[^>]*>/);
    expect(markup).toContain('dir="rtl"');
    expect(markup).toContain('dir="ltr"');
    expect(markup).not.toMatch(/geocod|provider|GPS|road.?snapp|map/i);
  });

  it("keeps retired and already-used stops free of edit affordances", () => {
    const retired = renderToStaticMarkup(
      <StopEditor stop={{ ...activeStop, status: "retired" }} used={false} busy={false} locale="en" onSave={vi.fn()} />
    );
    const used = renderToStaticMarkup(
      <StopEditor stop={activeStop} used busy={false} locale="en" onSave={vi.fn()} />
    );

    expect(retired).not.toContain("<form");
    expect(retired).not.toContain("Save changes");
    expect(used).not.toContain("<form");
    expect(used).not.toContain("Save changes");
  });

  it("provides complete Arabic edit and manual-coordinate guidance", () => {
    const markup = renderToStaticMarkup(
      <StopEditor stop={activeStop} used={false} busy={false} locale="ar" onSave={vi.fn()} />
    );

    expect(markup).toContain("الاسم بالعربية");
    expect(markup).toContain("الاسم بالإنجليزية");
    expect(markup).toContain("الإحداثيات مُدخلة يدوياً.");
    expect(markup).not.toMatch(/خريطة|مزود|GPS/i);
  });

  it("submits the immutable key with edited allowlisted stop fields", async () => {
    let submitted: { id: string; stopKey: string; name: string } | null = null;
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<StopEditor
        stop={activeStop}
        used={false}
        busy={false}
        locale="en"
        onSave={(id, draft) => { submitted = { id, stopKey: draft.stop_key, name: draft.name_en }; }}
      />);
    });
    const name = host.querySelector<HTMLInputElement>('input[name="name_en"]')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(name, "PPU Main Gate");
      name.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      host.querySelector<HTMLFormElement>("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(submitted).toEqual({ id: "stop_1", stopKey: "ppu-main", name: "PPU Main Gate" });
    root.unmount();
  });
});
