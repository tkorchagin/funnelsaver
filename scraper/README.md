# FunnelSaver Scraper

Automated browser-based funnel scraping using Playwright.

## Features

- Automated navigation through web funnels
- Smart form filling (email, phone, name, text fields)
- Button and link detection with priorities
- Cookie consent handling
- Screenshot capture at each step
- HTML and Markdown extraction
- Network request logging
- Domain-restricted navigation
- Loop detection (visited URL tracking)

## Setup

### Local Development

1. Create virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Install Playwright browsers:
```bash
playwright install chromium
```

4. Run scraper:
```bash
python -m src.main --url "https://example.com" --max-steps 20
```

## Usage

### Basic Command

```bash
python -m src.main --url "https://example.com"
```

### Command Line Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--url` | string | required | Starting URL of the funnel |
| `--max-steps` | int | 20 | Maximum number of steps |
| `--config` | string | - | Path to YAML config file |
| `--headless` | flag | true | Headless browser mode |
| `--headed` | flag | false | Visible browser mode |
| `--interactive` | flag | false | Interactive mode (not implemented) |
| `--debug` | flag | false | Debug mode |
| `--pause-at` | int | - | Step number to pause at |
| `--keep-open` | flag | false | Keep browser open after completion |

### Examples

**Visible browser with 50 steps:**
```bash
python -m src.main \
  --url "https://example.com/funnel" \
  --max-steps 50 \
  --headed
```

**Debug mode with pause:**
```bash
python -m src.main \
  --url "https://example.com/funnel" \
  --headed \
  --pause-at 10 \
  --keep-open
```

**With custom config:**
```bash
python -m src.main \
  --url "https://example.com" \
  --config .funnelsaver.yml \
  --max-steps 100
```

## Configuration

Create `.funnelsaver.yml`:

```yaml
viewport:
  width: 430
  height: 932

user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"

max_steps: 20
screenshot_delay_ms: 2000

default_form_values:
  name: "Alex Johnson"
  email: "test@example.com"
  phone: "+1234567890"
  message: "Test message"
  location: "San Francisco"
  text: "Test input"
```

## Project Structure

```
scraper/
├── src/
│   ├── __init__.py
│   ├── main.py           # CLI entry point
│   ├── browser.py        # Playwright wrapper
│   ├── clicker.py        # Navigation logic
│   ├── scraper.py        # Screenshot & HTML capture
│   ├── reporter.py       # Report generation
│   └── config.py         # Configuration
├── outputs/              # Scraping results (gitignored)
├── requirements.txt
├── setup_venv.sh
└── README.md
```

## How It Works

### 1. Initialization
- Launch Chromium browser (headless or visible)
- Configure viewport and user-agent
- Navigate to starting URL
- Set up network logging

### 2. Step 0 (Initial Page)
- Accept cookies if present
- Capture screenshot
- Save HTML
- Extract markdown content
- Add URL to visited list

### 3. Steps 1-N (Main Loop)

For each step:

1. **Accept Cookies**
   - Detect cookie banners
   - Click accept button

2. **Fill Forms**
   - Find all visible input fields
   - Detect field type (email, phone, name, etc.)
   - Fill with appropriate values
   - Email fields use slow typing (100ms/char)

3. **Find Clickable Element**
   - Search for buttons
   - Search for links
   - Prioritize "Next", "Continue" buttons
   - Exclude: back, help, privacy, logo
   - Check element is visible and enabled
   - Verify domain matches initial domain
   - Check URL not already visited

4. **Click Element**
   - Click selected element
   - Wait for navigation/redirect

5. **Handle Network Errors**
   - Detect "Network Error" in page
   - Wait 5 seconds
   - Retry click

6. **Wait for Auto-Redirect**
   - If no clickable elements found
   - Wait up to 30 seconds
   - Check every second for:
     - URL change (redirect)
     - New clickable elements

7. **Capture Results**
   - Screenshot
   - HTML
   - Markdown content
   - Record step in report
   - Add URL to visited list

### 4. Stop Conditions

Loop stops when:
- Reached max_steps
- No clickable elements and no auto-redirect
- Navigation error

### 5. Generate Reports

- `report.md` - Human-readable report
- `report.json` - Structured data
- Individual step files

## Output Structure

```
outputs/{domain}_{timestamp}/
├── report.md              # Summary report
├── report.json            # Structured data
├── step_0.png             # Screenshot
├── step_0.html            # HTML source
├── step_1.png
├── step_1.html
└── ...
```

## Modules

### config.py
- Loads YAML configuration
- Default viewport (430x932 - iPhone)
- Default user-agent
- Default form values

### browser.py
- Playwright wrapper
- Browser lifecycle management
- Headless/headed modes
- Keep-open functionality

### clicker.py
- Button and link detection
- Form filling logic
- Cookie consent handling
- Priority-based selection
- Email slow typing (anti-fraud)
- Excludes unwanted elements

Button selectors:
```python
["button", "[role='button']", "input[type='submit']",
 "input[type='button']", "[data-testid*='button']", "div[onclick]"]
```

Exclude patterns:
```python
["back", "previous", "help", "support", "logo",
 "home", "privacy", "terms", "cookie", "policy"]
```

### scraper.py
- Screenshot capture (PNG)
- HTML saving
- Markdown extraction (using markdownify)
- Directory structure creation

### reporter.py
- Markdown report generation
- JSON report generation
- Step recording
- Timestamp formatting

### main.py
- CLI argument parsing
- Main navigation loop
- Network request logging
- Error handling
- Pause and keep-open support

## Network Logging

Logs all fetch/XHR requests:

```
>> OUTGOING: POST https://api.example.com/submit
<< RESPONSE: 200 https://api.example.com/submit
!! NETWORK ERROR: https://api.example.com/failed - net::ERR_FAILED
```

## Form Filling

### Supported Input Types
- Email (slow typing, 100ms/char)
- Phone
- Name
- Text
- Message/textarea
- Location
- Number
- Checkboxes
- Radio buttons

### Field Detection

By placeholder, name, id, or type attributes:
```python
email: ["email", "e-mail", "mail"]
phone: ["phone", "tel", "mobile"]
name: ["name", "firstname", "lastname", "full name"]
```

### Email Special Handling
- Uses `press_sequentially` with 100ms delay
- Waits 5 seconds after entry for validation
- Prevents anti-fraud detection

## Debug Mode

### Pause at Step
```bash
python -m src.main --url "..." --pause-at 5 --headed
```

Opens Playwright Inspector at step 5:
- Inspect DOM
- View Network tab
- Check Console
- Manual interaction
- Click Resume to continue

### Keep Browser Open
```bash
python -m src.main --url "..." --headed --keep-open
```

After completion:
- Browser stays open
- Manual inspection possible
- Press Ctrl+C to close

## Known Limitations

1. **iframe** - Cannot interact with content inside iframes
2. **Shadow DOM** - Cannot access elements in shadow DOM
3. **CAPTCHA** - Cannot solve captchas
4. **JavaScript-heavy SPAs** - Fixed timeouts may not be enough
5. **Anti-bot systems** - May be blocked by aggressive systems

## Integration with Backend

Called by Celery task in [backend/tasks.py](../backend/tasks.py):

```python
from src.main import run_funnel

asyncio.run(run_funnel(
    url=project.url,
    headless=True,
    max_steps=20
))
```

Outputs are automatically:
- Copied to backend uploads directory
- Stored in database
- Associated with project

## Troubleshooting

**Playwright not found**
```bash
playwright install chromium
```

**No clickable elements**
- Check page loaded completely
- Try increasing screenshot_delay_ms
- Use --headed to see page visually

**Form not filling**
- Add field selectors in clicker.py
- Check if field is in iframe (not supported)
- Use debug mode to inspect

**Network errors**
- Check network tab in debug mode
- Verify API endpoints are accessible
- Increase wait times if needed

## Development

To modify scraping logic:

1. **Button detection**: Edit `clicker.py` - `BUTTON_SELECTORS`
2. **Form fields**: Edit `clicker.py` - `input_selectors`
3. **Exclusions**: Edit `clicker.py` - `EXCLUDE_PATTERNS`
4. **Timeouts**: Edit `main.py` - wait times
5. **Viewport**: Edit `config.py` or `.funnelsaver.yml`

## Testing

Manual testing:
```bash
python -m src.main \
  --url "https://example.com" \
  --headed \
  --max-steps 5 \
  --keep-open
```

Watch browser actions and verify:
- Forms are filled correctly
- Correct buttons are clicked
- Navigation follows funnel path
- Screenshots are captured
- Reports are generated

## Contributing

This is an internal tool. When modifying:

1. Test with --headed mode first
2. Verify outputs directory structure
3. Check report.md and report.json
4. Test with different funnels
5. Document new features in README
