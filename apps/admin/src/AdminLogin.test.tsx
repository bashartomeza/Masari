// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { LocaleProvider } from "./i18n/LocaleContext";
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: Root; let host: HTMLDivElement;
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); vi.unstubAllGlobals(); });
async function render(locale: "ar" | "en", google = false) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ google_admin_login_available: google, google_admin_client_id: google ? "admin-web" : null }))));
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => { root.render(<LocaleProvider storage={{ getItem: () => locale, setItem: () => {} }}><App config={{ appEnv: "test", apiBaseUrl: "http://api.test", demoFeaturesEnabled: false, routeManagementEnabled: false }} sessionStore={{ getItem: () => null, setItem: () => {}, removeItem: () => {} }} legacyStore={{ getItem: () => null, setItem: () => {}, removeItem: () => {} }} /></LocaleProvider>); });
}
describe("Admin login", () => {
  it.each(["ar", "en"] as const)("offers accessible email login in %s with direction preserved", async (locale) => {
    await render(locale);
    expect(host.querySelector('main')?.getAttribute("dir")).toBe(locale === "ar" ? "rtl" : "ltr");
    const email = host.querySelector('input[type="email"]');
    expect(email).not.toBeNull(); expect(email?.getAttribute("autocomplete")).toBe("username");
    expect(email?.closest("label")?.textContent).toBe(locale === "ar" ? "البريد الإلكتروني للمسؤول" : "Admin email");
    expect(host.querySelector('input[type="tel"]')).toBeNull();
    expect(host.querySelector('[data-google-sign-in]')).toBeNull();
  });
  it("renders Google only with capability and passes the exact Admin audience to the SDK", async () => {
    const initialize = vi.fn(); const renderButton = vi.fn((element: HTMLElement) => { const b = document.createElement("button"); b.textContent = "Sign in with Google"; element.append(b); });
    vi.stubGlobal("google", { accounts: { id: { initialize, renderButton, cancel: vi.fn() } } });
    await render("en", true);
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: "admin-web", auto_select: false }));
    expect(host.querySelector('[data-google-sign-in]')?.textContent).toContain("Sign in with Google");
  });
  it("allows cancellation during SDK loading without starting a session", async () => {
    await render("en", true);
    const cancel = [...host.querySelectorAll("button")].find((b) => b.textContent === "Cancel");
    expect(cancel).toBeDefined();
    act(() => cancel?.click());
    expect(host.textContent).toContain("Google sign-in cancelled");
    expect(host.querySelector('input[type="email"]')).not.toBeNull();
    const retry = [...host.querySelectorAll("button")].find((b) => b.textContent === "Retry");
    expect(retry).toBeDefined();
    act(() => retry?.click());
    expect(host.textContent).toContain("Loading Google sign-in");
  });
  it("announces provider load failure without removing email login", async () => {
    await render("en", true);
    const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    act(() => script?.dispatchEvent(new Event("error")));
    expect(host.querySelector('[role="status"]')?.textContent).toContain("Google sign-in is unavailable");
    expect(host.querySelector('input[type="email"]')).not.toBeNull();
  });
});
