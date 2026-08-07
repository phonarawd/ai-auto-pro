# Connector plugins

Platform connectors register via **Manifest only** (`@clime/plugin-sdk`).

**Hard rule (C2A / RFC 10):** Do **not** import `playwright` or `puppeteer` here.
Session automation goes through `@clime/browser-automation` (BAE) exclusively.
