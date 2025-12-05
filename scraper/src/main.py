import argparse
import asyncio
from pathlib import Path
from src.config import Config
from src.browser import Browser
from src.clicker import Clicker
from src.scraper import Scraper
from src.reporter import Reporter

async def run_funnel(url: str, config_path: str = None, headless: bool = True,
                      interactive: bool = False, max_steps: int = 20, debug: bool = False,
                      pause_at_step: int = None, keep_open: bool = False, output_dir: str = None,
                      on_step_completed = None, on_progress = None):
    from urllib.parse import urlparse

    config = Config(config_path) if config_path else Config()
    # Override config if args provided
    if max_steps:
        config.data['max_steps'] = max_steps
    async with Browser(config, headless=headless, keep_open=keep_open) as page:

        # Set up network logging to debug API calls
        def log_request(request):
            if request.resource_type in ['fetch', 'xhr']:
                print(f">> OUTGOING: {request.method} {request.url}")

        def log_response(response):
            if response.request.resource_type in ['fetch', 'xhr']:
                print(f"<< RESPONSE: {response.status} {response.url}")

        def log_request_failed(request):
            failure_text = request.failure if request.failure else 'Unknown error'
            print(f"!! NETWORK ERROR: {request.url} - {failure_text}")

        # Attach listeners
        page.on("request", log_request)
        page.on("response", log_response)
        page.on("requestfailed", log_request_failed)
        clicker = Clicker(config)
        if output_dir:
            # Use provided output_dir directly without subdirectory
            reporter = Reporter(url, output_dir=output_dir, use_subdirectory=False)
        else:
            # Default: create outputs/domain_timestamp subdirectory
            reporter = Reporter(url)
        scraper = Scraper(output_dir=reporter.run_dir)

        # Navigate to URL and get initial domain
        if on_progress:
            await on_progress({'action': 'navigate', 'message': f'Navigating to {url}...'})
        await page.goto(url)
        await page.wait_for_timeout(2000)  # Wait for page to load

        # Extract initial domain (after any redirects)
        initial_domain = urlparse(page.url).netloc

        # Track visited URLs to avoid loops
        # For SPAs, we track URL+content_hash to allow same URL with different content
        visited_states = set()

        # Track consecutive failures to detect infinite loops
        consecutive_failures = 0
        max_consecutive_failures = 3
        last_url = None
        last_page_hash = None  # Track page content changes for SPAs

        # Step 0: Capture initial page
        if on_progress:
            await on_progress({'action': 'cookies', 'message': 'Checking for cookie banners...'})
        await clicker.accept_cookies(page)

        if on_progress:
            await on_progress({'action': 'screenshot', 'message': 'Capturing initial screenshot...'})
        screenshot_path = await scraper.capture_screenshot(page, 0)
        html_path = await scraper.save_html(page, 0)
        markdown_content = await scraper.extract_markdown(page)

        # Extract metadata (title, description, favicon) on first page load
        metadata = await scraper.extract_metadata(page)
        favicon_filename = await scraper.download_favicon(metadata.get('favicon_url'), None)

        reporter.record_step(0, page.url, screenshot_path, markdown_content, "Initial page load")

        if on_step_completed:
            await on_step_completed({
                'step': 0,
                'url': page.url,
                'screenshot_path': screenshot_path,
                'html_path': html_path,
                'markdown_content': markdown_content,
                'action_desc': "Initial page load",
                'metadata': metadata,
                'favicon_filename': favicon_filename
            })

        # Track initial state
        try:
            initial_content = await page.content()
            import hashlib
            initial_hash = hashlib.md5(initial_content.encode()).hexdigest()
            visited_states.add(f"{page.url}:{initial_hash}")
        except:
            visited_states.add(page.url)

        # Steps 1-N: Click through funnel
        for step in range(1, config.max_steps + 1):
            # Debug: pause at specific step
            if pause_at_step and step == pause_at_step:
                print(f"\n🔍 PAUSED at step {step} - URL: {page.url}")
                print(f"Opening Playwright Inspector...")
                await page.pause()  # Opens Playwright Inspector

            # Accept cookies if any
            if on_progress:
                await on_progress({'action': 'cookies', 'message': f'Step {step}: Checking for cookie banners...', 'step': step})
            await clicker.accept_cookies(page)

            # Wait for animations to complete before screenshot (configurable delay)
            if on_progress:
                await on_progress({'action': 'wait', 'message': f'Step {step}: Waiting for page to settle...', 'step': step})
            await page.wait_for_timeout(config.screenshot_delay_ms)

            # Capture screenshot, HTML and extract markdown BEFORE clicking
            # This gives time for images and animations to load
            if on_progress:
                await on_progress({'action': 'screenshot', 'message': f'Step {step}: Capturing screenshot...', 'step': step})
            screenshot_path = await scraper.capture_screenshot(page, step)
            html_path = await scraper.save_html(page, step)
            markdown_content = await scraper.extract_markdown(page)

            # Perform click (or interactive prompt could be added later)
            print(f"[Step {step}] Current URL: {page.url}")
            print(f"[Step {step}] Looking for clickable elements...")
            if on_progress:
                await on_progress({'action': 'looking', 'message': f'Step {step}: Looking for clickable elements...', 'step': step})

            # Extract URLs from visited_states for backward compatibility with clicker
            visited_urls = {state.split(':')[0] for state in visited_states}
            action_desc = await clicker.click_random(page, initial_domain, visited_urls)
            print(f"[Step {step}] Action: {action_desc}")
            if on_progress:
                await on_progress({'action': 'click', 'message': f'Step {step}: {action_desc}', 'step': step})

            # Wait for navigation/page updates to complete
            try:
                await page.wait_for_load_state('domcontentloaded', timeout=3000)
            except Exception:
                pass  # Continue if timeout

            # Check for error messages on page (Network Error, validation errors, etc.)
            page_content = await page.content()
            if "Network Error" in page_content or "network error" in page_content.lower():
                # Network error detected - wait and try clicking again
                print(f"[Step {step}] ⚠️ Network error detected, waiting 5 seconds before retry...")
                await page.wait_for_timeout(5000)
                # Try clicking the same button again
                retry_action = await clicker.click_random(page, initial_domain, visited_urls)
                if retry_action != action_desc:
                    action_desc = f"{action_desc} (retried after network error: {retry_action})"
                print(f"[Step {step}] Retry action: {retry_action}")

            # If no clickable elements found, wait 30 seconds for possible redirect or elements to appear
            # This handles loading pages with auto-redirect or dynamically loaded content
            if action_desc == "No clickable elements found":
                print(f"[Step {step}] ⏳ No clickable elements found, waiting up to 30 seconds for content to load...")
                current_url = page.url
                # Wait up to 30 seconds for redirect or new elements
                for i in range(30):
                    await page.wait_for_timeout(1000)  # Wait 1 second
                    if page.url != current_url:
                        # Redirect happened, continue to next step
                        print(f"[Step {step}] ✓ Redirect detected after {i+1}s: {page.url}")
                        action_desc = f"{action_desc} (waited {i+1}s for auto-redirect)"
                        break
                    # Check if clickable elements appeared
                    new_action = await clicker.click_random(page, initial_domain, visited_urls)
                    if new_action != "No clickable elements found":
                        # Elements appeared, click and continue
                        print(f"[Step {step}] ✓ Elements appeared after {i+1}s: {new_action}")
                        action_desc = f"waited {i+1}s, then {new_action}"
                        break
                    # Log progress every 5 seconds
                    if (i + 1) % 5 == 0:
                        print(f"[Step {step}] Still waiting... ({i+1}/30s)")
                
                if action_desc == "No clickable elements found":
                    print(f"[Step {step}] ❌ No elements found after 30 seconds, stopping funnel")

            # Record step
            print(f"[Step {step}] Recording step data...")
            reporter.record_step(step, page.url, screenshot_path, markdown_content, action_desc)

            if on_step_completed:
                await on_step_completed({
                    'step': step,
                    'url': page.url,
                    'screenshot_path': screenshot_path,
                    'html_path': html_path,
                    'markdown_content': markdown_content,
                    'action_desc': action_desc
                })

            # Check for infinite loops (same URL AND same content, with failed actions)
            current_url = page.url

            # Calculate page content hash to detect changes in SPAs
            try:
                page_content = await page.content()
                import hashlib
                current_page_hash = hashlib.md5(page_content.encode()).hexdigest()
            except:
                current_page_hash = None

            # Only count as failure if BOTH URL and content are unchanged
            if "Failed to click" in action_desc or "No clickable elements found" in action_desc:
                if current_url == last_url and current_page_hash == last_page_hash:
                    consecutive_failures += 1
                    print(f"[Step {step}] ⚠️  Consecutive failure {consecutive_failures}/{max_consecutive_failures} (same URL & content)")
                else:
                    # URL or content changed - reset counter (SPA progress detected)
                    if current_url == last_url and current_page_hash != last_page_hash:
                        print(f"[Step {step}] ✓ SPA detected: Same URL but content changed")
                    consecutive_failures = 0
            else:
                # Successful action - reset counter
                consecutive_failures = 0

            last_url = current_url
            last_page_hash = current_page_hash

            # Break if too many consecutive failures (infinite loop detected)
            if consecutive_failures >= max_consecutive_failures:
                print(f"[Step {step}] ❌ Detected infinite loop: {consecutive_failures} consecutive failures on same URL. Stopping.")
                break

            # Track state (URL + content hash) instead of just URL for SPA support
            state_key = f"{current_url}:{current_page_hash}" if current_page_hash else current_url
            visited_states.add(state_key)
            # Break if no clickable elements
            if action_desc == "No clickable elements found":
                break
        print(f"Funnel run completed. Report: {reporter.md_path}\nData: {reporter.json_path}")

def main():
    parser = argparse.ArgumentParser(description="Automated funnel runner")
    parser.add_argument("--url", required=True, help="Starting URL of the funnel")
    parser.add_argument("--config", help="Path to configuration YAML file")
    parser.add_argument("--headless", action="store_true", default=True, help="Run browser in headless mode")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode (visible)")
    parser.add_argument("--interactive", action="store_true", help="Enable interactive mode for manual choices")
    parser.add_argument("--max-steps", type=int, default=20, help="Maximum number of steps to execute")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument("--pause-at", type=int, help="Pause at specific step number for debugging")
    parser.add_argument("--keep-open", action="store_true", help="Keep browser open after script completes for manual inspection")
    args = parser.parse_args()

    # If --headed is specified, set headless=False
    headless_mode = not args.headed if args.headed else args.headless

    asyncio.run(run_funnel(url=args.url, config_path=args.config,
                         headless=headless_mode, interactive=args.interactive,
                         max_steps=args.max_steps, debug=args.debug,
                         pause_at_step=args.pause_at, keep_open=args.keep_open))

if __name__ == "__main__":
    main()
