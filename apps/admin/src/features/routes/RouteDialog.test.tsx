import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RouteDialog } from "./RouteDialog";

describe("RouteDialog", () => {
  it("renders a labeled modal dialog with localized close affordances and supplied direction", () => {
    const markup = renderToStaticMarkup(
      <RouteDialog open title="إنشاء مسار" description="أدخل هوية المسار" dir="rtl" onClose={vi.fn()}>
        <button type="button" autoFocus>متابعة</button>
      </RouteDialog>
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toMatch(/aria-labelledby="[^"]+"/);
    expect(markup).toContain('aria-label="إغلاق"');
    expect(markup).toContain('dir="rtl"');
    expect(markup).toContain("أدخل هوية المسار");
  });

  it("renders no closed dialog markup", () => {
    expect(renderToStaticMarkup(
      <RouteDialog open={false} title="Create route" onClose={vi.fn()}>Content</RouteDialog>
    )).toBe("");
  });

  it("disables close affordances while busy", () => {
    const markup = renderToStaticMarkup(
      <RouteDialog open title="Create route" busy onClose={vi.fn()}>Content</RouteDialog>
    );

    expect(markup).toMatch(/<button(?=[^>]*aria-label="Close")(?=[^>]*disabled="")[^>]*>/);
    expect(markup).toContain('aria-disabled="true"');
  });
});
