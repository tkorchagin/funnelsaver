# Funnel Automation Tool – Specification (TODO)

## Overview
Develop a lightweight, headless automation utility that navigates through marketing funnels (web pages) provided via URLs. The tool must:
- Randomly click visible actionable elements (buttons, links, form submissions).
- Accept cookie consent dialogs automatically.
- Capture a screenshot **immediately after each interaction**.
- Extract the visible text from the page, convert it to Markdown, and store it.
- Append both the screenshot and the Markdown content to a **Markdown report** after each step, ensuring crash‑resilience (partial results are saved).
- Simultaneously maintain a **JSON log** containing for each step:
  - Step number
  - URL visited
  - Path to the screenshot file
  - Extracted Markdown text
  - Description of the performed action (e.g., "clicked button 'Continue'")
  - Timestamp
- Use the `markdownify` library for HTML‑to‑Markdown conversion.
- Allow configuration of:
  - Device viewport size and user‑agent (default: iPhone 16 Pro Max emulation).
  - Default form‑field values (e.g., name, email) for auto‑filling.
  - Maximum number of steps per funnel.
  - Optional interactive mode where the CLI prompts the user to choose among multiple clickable elements.
- Provide a CLI entry‑point (`funnel_runner.py`) with arguments for:
  - `--url` (required)
  - `--config` (path to YAML/ENV config file)
  - `--headless` (default true)
  - `--interactive` (default false)
  - `--max‑steps` (default 20)
- Output files are stored under `outputs/` with timestamped names, e.g., `funnel_report_20251125_1600.md` and `funnel_data_20251125_1600.json`.
- Include a `setup_venv.sh` script to create a Python 3.13 virtual environment and install dependencies (`playwright`, `pyyaml`, `markdownify`, `pillow`).
- Ensure the script can be run on macOS without requiring a display (headless Chrome/WebKit).

## Project Structure
```
/funnelsaver
│   README.md                # High‑level description
│   todo.md                  # This specification (TODO)
│   requirements.txt         # Python dependencies
│   setup_venv.sh            # Venv creation script
│
├── src
│   ├── __init__.py
│   ├── config.py            # Loads YAML/ENV configuration
│   ├── browser.py           # Playwright wrapper (launch, device emulation)
│   ├── clicker.py           # Random element selection & interaction logic
│   ├── scraper.py           # Screenshot + HTML extraction
│   ├── reporter.py          # Incremental Markdown & JSON writing
│   └── main.py              # CLI entry point (argparse)
│
└── outputs
    ├── funnel_report_*.md   # Generated markdown reports
    └── funnel_data_*.json   # Generated JSON logs
```

## Milestones
1. **Environment Setup** – `setup_venv.sh`, `requirements.txt`.
2. **Configuration Loader** – support YAML and optional `.env`.
3. **Playwright Wrapper** – device emulation, headless launch.
4. **Auto‑Click Engine** – detection of clickable elements, random selection, cookie handling.
5. **Screenshot & Text Extraction** – capture PNG, retrieve `page.content()`, convert via `markdownify`.
6. **Reporting Layer** – incremental Markdown append, JSON array update after each step.
7. **CLI & Interactive Mode** – argument parsing, optional prompts for user choices.
8. **Testing & Crash‑Resilience** – simulate failures, verify partial outputs are preserved.
9. **Documentation** – README with usage examples, configuration guide.

## Non‑Functional Requirements
- **No neural networks** – rely solely on DOM inspection and simple heuristics.
- **Lightweight** – headless Chromium/WebKit, minimal memory footprint.
- **Cross‑platform** – works on macOS (primary) and Linux.
- **Extensible** – future developers can add custom element selectors or more sophisticated decision logic.

---
*This TODO serves as a complete specification for any developer to continue implementation.*
