import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CanonicalStop } from "../../api";
import { StopEditor } from "./StopEditor";

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
  it("offers a labeled bilingual manual-coordinate form for an active unused stop", () => {
    const markup = renderToStaticMarkup(
      <StopEditor stop={activeStop} used={false} busy={false} locale="en" onSave={vi.fn()} />
    );

    expect(markup).toContain("Edit stop");
    expect(markup).toContain("Arabic name");
    expect(markup).toContain("English name");
    expect(markup).toContain("Service region");
    expect(markup).toContain("Latitude");
    expect(markup).toContain("Longitude");
    expect(markup).toContain("Coordinates are supplied manually");
    expect(markup).toMatch(/<input(?=[^>]*name="stop_key")(?=[^>]*readOnly="")[^>]*>/);
    expect(markup).toMatch(/<input(?=[^>]*name="latitude")(?=[^>]*min="-90")(?=[^>]*max="90")[^>]*>/);
    expect(markup).toMatch(/<input(?=[^>]*name="longitude")(?=[^>]*min="-180")(?=[^>]*max="180")[^>]*>/);
    expect(markup).toContain('dir="rtl"');
    expect(markup).toContain('dir="ltr"');
  });

  it("keeps retired and already-used stops free of edit affordances", () => {
    const retired = renderToStaticMarkup(
      <StopEditor stop={{ ...activeStop, status: "retired" }} used={false} busy={false} locale="en" onSave={vi.fn()} />
    );
    const used = renderToStaticMarkup(
      <StopEditor stop={activeStop} used busy={false} locale="en" onSave={vi.fn()} />
    );

    expect(retired).not.toContain("Edit stop");
    expect(retired).not.toContain("Save changes");
    expect(used).not.toContain("Edit stop");
    expect(used).not.toContain("Save changes");
  });

  it("provides complete Arabic edit and manual-coordinate guidance", () => {
    const markup = renderToStaticMarkup(
      <StopEditor stop={activeStop} used={false} busy={false} locale="ar" onSave={vi.fn()} />
    );

    expect(markup).toContain("تعديل المحطة");
    expect(markup).toContain("الاسم بالعربية");
    expect(markup).toContain("الاسم بالإنجليزية");
    expect(markup).toContain("الإحداثيات مُدخلة يدوياً");
  });
});
