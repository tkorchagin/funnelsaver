import argparse
import asyncio
from pathlib import Path
from src.config import Config
from src.browser import Browser
from src.clicker import Clicker
from src.scraper import Scraper
from src.reporter import Reporter

async def run_funnel(url: str, config_path: str = None, headless: bool = True,
                      interactive: bool = False, max_steps: int = 20):
    from urllib.parse import urlparse

    config = Config(config_path) if config_path else Config()
    # Override config if args provided
    if max_steps:
        config.data['max_steps'] = max_steps
    async with Browser(config) as page:
        clicker = Clicker()
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
            # Accept cookies if any
            await clicker.accept_cookies(page)
            # Perform click (or interactive prompt could be added later)
            action_desc = await clicker.click_random(page, initial_domain, visited_urls)

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

            # Capture screenshot, HTML and extract markdown
            screenshot_path = await scraper.capture_screenshot(page, step)
            html_path = await scraper.save_html(page, step)
            markdown_content = await scraper.extract_markdown(page)
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
    parser.add_argument("--interactive", action="store_true", help="Enable interactive mode for manual choices")
    parser.add_argument("--max-steps", type=int, default=20, help="Maximum number of steps to execute")
    args = parser.parse_args()
    asyncio.run(run_funnel(url=args.url, config_path=args.config,
                         headless=args.headless, interactive=args.interactive,
                         max_steps=args.max_steps))

if __name__ == "__main__":
    main()
