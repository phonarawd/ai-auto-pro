import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge.js";
import { Button } from "./Button.js";
import { Card } from "./Card.js";
import { CommandPalette } from "./CommandPalette.js";
import { DataRow } from "./DataRow.js";
import { IconButton } from "./IconButton.js";
import {
  CLIME_FORBIDDEN_PRIMITIVES,
  CLIME_PRIMITIVE_WHITELIST,
} from "./index.js";
import { Panel } from "./Panel.js";
import { Toast } from "./Toast.js";
import { Toolbar } from "./Toolbar.js";

describe("s6-b whitelist primitives smoke", () => {
  it("exports exactly the V1 whitelist (+ Card interaction-only)", () => {
    expect([...CLIME_PRIMITIVE_WHITELIST].sort()).toEqual(
      [
        "Badge",
        "Button",
        "Card",
        "CommandPalette",
        "DataRow",
        "IconButton",
        "Panel",
        "Toast",
        "Toolbar",
      ].sort(),
    );
    expect(CLIME_FORBIDDEN_PRIMITIVES).toContain("StatCard");
    expect(CLIME_FORBIDDEN_PRIMITIVES).toContain("MetricStrip");
  });

  it("renders Button / IconButton / Badge / Toolbar / Panel / DataRow", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(Button, { variant: "primary" }, "START"),
        createElement(Button, { variant: "secondary" }, "검토"),
        createElement(IconButton, { label: "Refresh" }, "↻"),
        createElement(
          Badge,
          { tone: "success", capability: "canPublish" },
          "canPublish",
        ),
        createElement(Toolbar, null, createElement(Button, null, "Go")),
        createElement(Panel, { elevated: true }, "Ops panel"),
        createElement(DataRow, {
          label: "publishMode",
          value: "api",
          trailing: createElement(Badge, { tone: "info" }, "api"),
        }),
      ),
    );
    expect(html).toContain('data-clime-primitive="Button"');
    expect(html).toContain('data-clime-primitive="IconButton"');
    expect(html).toContain('data-clime-primitive="Badge"');
    expect(html).toContain('data-capability="canPublish"');
    expect(html).toContain('data-clime-primitive="Toolbar"');
    expect(html).toContain('data-clime-primitive="Panel"');
    expect(html).toContain('data-clime-primitive="DataRow"');
    expect(html).toContain("var(--clime-accent)");
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("Toast requires Inbox handoff", () => {
    const html = renderToStaticMarkup(
      createElement(
        Toast,
        { inboxHandoff: { kind: "open-inbox" }, tone: "danger" },
        "PAUSED_CHALLENGE",
      ),
    );
    expect(html).toContain('data-clime-primitive="Toast"');
    expect(html).toContain('data-inbox-handoff="open-inbox"');
  });

  it("CommandPalette renders when open", () => {
    const html = renderToStaticMarkup(
      createElement(CommandPalette, {
        open: true,
        query: "",
        onQueryChange: () => undefined,
        items: [{ id: "start", label: "START mission" }],
      }),
    );
    expect(html).toContain('data-clime-primitive="CommandPalette"');
    expect(html).toContain("START mission");
    expect(
      renderToStaticMarkup(
        createElement(CommandPalette, {
          open: false,
          query: "",
          onQueryChange: () => undefined,
          items: [],
        }),
      ),
    ).toBe("");
  });

  it("Card is interaction-only (interactive: true + label)", () => {
    const html = renderToStaticMarkup(
      createElement(
        Card,
        { interactive: true, interactionLabel: "Select plan" },
        "Plan A",
      ),
    );
    expect(html).toContain('data-clime-card-policy="interaction-only"');
    expect(html).toContain('aria-label="Select plan"');
    expect(html).toContain('role="button"');
  });
});
