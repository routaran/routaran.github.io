import { describe, it, expect } from "vitest";
import { router, ROUTES } from "../router";

describe("Router", () => {
  it("has login route", () => {
    const route = router.routes[0].children?.find((r) => r.path === "login");
    expect(route).toBeDefined();
  });

  it("has auth callback route", () => {
    const route = router.routes[0].children?.find(
      (r) => r.path === "auth/callback"
    );
    expect(route).toBeDefined();
  });

  it("has dashboard route", () => {
    const route = router.routes[0].children?.find(
      (r) => r.path === "dashboard"
    );
    expect(route).toBeDefined();
  });

  it("has protected routes", () => {
    const playDatesRoute = router.routes[0].children?.find(
      (r) => r.path === "play-dates"
    );
    expect(playDatesRoute).toBeDefined();
    expect(playDatesRoute?.children).toBeDefined();
  });

  it("exports correct route paths", () => {
    expect(ROUTES.LOGIN).toBe("/login");
    expect(ROUTES.DASHBOARD).toBe("/dashboard");
    expect(ROUTES.PLAY_DATES.CREATE).toBe("/play-dates/create");
    expect(ROUTES.PLAY_DATES.DETAIL("123")).toBe("/play-dates/123");
    expect(ROUTES.ADMIN.AUDIT_LOG).toBe("/admin/audit-log");
  });
});
