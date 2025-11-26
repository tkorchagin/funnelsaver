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
                      pause_at_step: int = None, keep_open: bool = False):
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
        reporter = Reporter(url)
        scraper = Scraper(output_dir=reporter.run_dir)

        # Navigate to URL and get initial domain
        await page.goto(url)
        await page.wait_for_timeout(2000)  # Wait for page to load

        # Extract initial domain (after any redirects)
        initial_domain = urlparse(page.url).netloc

        # Track visited URLs to avoid loops
        visited_urls = set()

        # Step 0: Capture initial page
        await clicker.accept_cookies(page)
        screenshot_path = await scraper.capture_screenshot(page, 0)
        html_path = await scraper.save_html(page, 0)
        markdown_content = await scraper.extract_markdown(page)
        reporter.record_step(0, page.url, screenshot_path, markdown_content, "Initial page load")
        visited_urls.add(page.url)

        # Steps 1-N: Click through funnel
        for step in range(1, config.max_steps + 1):
            # Debug: pause at specific step
            if pause_at_step and step == pause_at_step:
                print(f"\n🔍 PAUSED at step {step} - URL: {page.url}")
                print(f"Opening Playwright Inspector...")
                await page.pause()  # Opens Playwright Inspector

            # Accept cookies if any
            await clicker.accept_cookies(page)
            
            # Wait for animations to complete before screenshot (configurable delay)
            await page.wait_for_timeout(config.screenshot_delay_ms)
            
            # Capture screenshot, HTML and extract markdown BEFORE clicking
            # This gives time for images and animations to load
            screenshot_path = await scraper.capture_screenshot(page, step)
            html_path = await scraper.save_html(page, step)
            markdown_content = await scraper.extract_markdown(page)
            
            # Perform click (or interactive prompt could be added later)
            action_desc = await clicker.click_random(page, initial_domain, visited_urls)

            # Check for error messages on page (Network Error, validation errors, etc.)
            page_content = await page.content()
            if "Network Error" in page_content or "network error" in page_content.lower():
                # Network error detected - wait and try clicking again
                print(f"Network error detected on step {step}, waiting 5 seconds before retry...")
                await page.wait_for_timeout(5000)
                # Try clicking the same button again
                retry_action = await clicker.click_random(page, initial_domain, visited_urls)
                if retry_action != action_desc:
                    action_desc = f"{action_desc} (retried after network error: {retry_action})"

            # If no clickable elements found, wait 20 seconds for possible redirect or elements to appear
            # This handles loading pages with auto-redirect or dynamically loaded content
            if action_desc == "No clickable elements found":
                current_url = page.url
                # Wait up to 20 seconds for redirect or new elements
                for i in range(20):
                    await page.wait_for_timeout(1000)  # Wait 1 second
                    if page.url != current_url:
                        # Redirect happened, continue to next step
                        action_desc = f"{action_desc} (waited {i+1}s for auto-redirect)"
                        break
                    # Check if clickable elements appeared
                    new_action = await clicker.click_random(page, initial_domain, visited_urls)
                    if new_action != "No clickable elements found":
                        # Elements appeared, click and continue
                        action_desc = f"waited {i+1}s, then {new_action}"
                        break

            # Record step
            reporter.record_step(step, page.url, screenshot_path, markdown_content, action_desc)
            visited_urls.add(page.url)
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
