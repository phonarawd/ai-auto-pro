# Toolchain Audit Log

Date: 2026-08-07 (Asia/Seoul)  
Machine: Windows 10 (19045) · `C:\Users\PC\AI_CONTENT_OS`

## Installed / verified this session

| Item | Result | Version / Path |
|---|---|---|
| Node.js (fnm in repo) | OK | **v22.14.0** via fnm (`.node-version`); system Node 24 remains as fallback outside fnm env |
| pnpm | OK | 11.4.0 |
| npm | OK | 10.9.2 |
| Git | OK | 2.54.0.windows.1 |
| GitHub CLI | OK + auth | gh 2.93.0 · account `phonarawd` |
| Python | OK | 3.12.10 |
| VS 2022 Build Tools + MSVC | OK (restart recommended) | `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools` |
| fnm | Installed | v1.39.0 |
| Ollama | Installed | 0.32.6 |
| sqlite3 CLI | Installed (scoop) | 3.53.4 |
| ripgrep | OK | 15.2.0 (scoop) |
| Docker | OK | 29.6.2 |
| Cursor / VS Code | OK | present |
| Disk free | OK / watch | ~47 GB on `C:` |
| git identity (local) | OK | `phonarawd <304456689+phonarawd@users.noreply.github.com>` |

## Remaining FAIL

None. Toolchain gate is **GREEN (0 FAIL)**.

## Warnings

| Item | Note |
|---|---|
| Node 24 vs Electron | Use fnm + `.node-version` **22.14.0** for this repo |
| `cl.exe` not on PATH | Expected; node-gyp finds VS Build Tools via vswhere |
| VS restart | Winget reported: **Restart PC to finish Build Tools installation** |
| Disk | Keep ≥20–25 GB free before Electron packaging |

## Not installing (by design)

Yarn, Chocolatey, Java, .NET SDK, Rust — not required for V1.

## Gate command

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-toolchain.ps1
```

Target: **GREEN (0 FAIL)** before Phase A app code.
