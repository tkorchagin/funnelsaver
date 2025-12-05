import argparse
import asyncio
from pathlib import Path
from src.config import Config
from src.browser import Browser
from src.clicker import Clicker
from src.scraper import Scraper
from src.reporter import Reporter


async def run_funnel(
    url: str,
    config_path: str = None,
    headless: bool = True,
    interactive: bool = False,
    max_steps: int = 20,
    debug: bool = False,
    pause_at_step: int = None,
    keep_open: bool = False,
    output_dir: str = None,
    on_step_completed=None,
    on_progress=None,
):
    from urllib.parse import urlparse

    config = Config(config_path) if config_path else Config()

    # Override config if args provided
    if max_steps:
        config.data["max_steps"] = max_steps

    # FORCE INCREASED DELAYS FOR SPA
    # Setting directly in data dict because the property is likely read-only
    config.data["screenshot_delay_ms"] = 2000

    async with Browser(config, headless=headless, keep_open=keep_open) as page:

        # Set up network logging
        def log_request(request):
            if request.resource_type in ["fetch", "xhr"]:
                print(f">> OUTGOING: {request.method} {request.url}")

        def log_response(response):
            if response.request.resource_type in ["fetch", "xhr"]:
                print(f"<< RESPONSE: {response.status} {response.url}")

        page.on("request", log_request)
        page.on("response", log_response)

        clicker = Clicker(config)
        if output_dir:
            reporter = Reporter(url, output_dir=output_dir, use_subdirectory=False)
        else:
            reporter = Reporter(url)
        scraper = Scraper(output_dir=reporter.run_dir)

        if on_progress:
            await on_progress(
                {"action": "navigate", "message": f"Navigating to {url}..."}
            )

        # Initial navigation
        await page.goto(url, wait_until="domcontentloaded")
        # Wait for potential redirects and initial loading
        await page.wait_for_timeout(3000)

        # Extract initial domain
        initial_domain = urlparse(page.url).netloc
        visited_states = set()

        # Step 0: Initial Capture
        if on_progress:
            await on_progress(
                {"action": "cookies", "message": "Checking for cookie banners..."}
            )
        await clicker.accept_cookies(page)

        if on_progress:
            await on_progress(
                {"action": "screenshot", "message": "Capturing initial screenshot..."}
            )

        screenshot_path = await scraper.capture_screenshot(page, 0)
        html_path = await scraper.save_html(page, 0)
        markdown_content = await scraper.extract_markdown(page)
        metadata = await scraper.extract_metadata(page)
        favicon_filename = await scraper.download_favicon(
            metadata.get("favicon_url"), None
        )

        reporter.record_step(
            0, page.url, screenshot_path, markdown_content, "Initial page load"
        )

        if on_step_completed:
            await on_step_completed(
                {
                    "step": 0,
                    "url": page.url,
                    "screenshot_path": screenshot_path,
                    "html_path": html_path,
                    "markdown_content": markdown_content,
                    "action_desc": "Initial page load",
                    "metadata": metadata,
                    "favicon_filename": favicon_filename,
                }
            )

        # Track initial state (URL + content hash)
        try:
            initial_content = await page.content()
            import hashlib

            initial_hash = hashlib.md5(initial_content.encode()).hexdigest()
            visited_states.add(f"{page.url}:{initial_hash}")
        except:
            visited_states.add(page.url)

        consecutive_failures = 0
        max_consecutive_failures = 3

        # --- LOOP START ---
        for step in range(1, config.max_steps + 1):
            if pause_at_step and step == pause_at_step:
                print(f"\n🔍 PAUSED at step {step}. Opening Inspector...")
                await page.pause()

            # 1. STABILIZE PAGE
            print(f"[Step {step}] Waiting for page to stabilize...")
            if on_progress:
                await on_progress(
                    {
                        "action": "wait",
                        "message": f"Step {step}: Waiting for animation...",
                        "step": step,
                    }
                )

            # Critical for SPA: Wait for network to be idle (data loading)
            try:
                await page.wait_for_load_state("networkidle", timeout=4000)
            except:
                pass

            # Critical for SPA: Explicit wait for CSS transitions
            # Use the value we set in data, or fallback to 2000
            delay = config.data.get("screenshot_delay_ms", 2000)
            await page.wait_for_timeout(delay)

            # 2. CHECK COOKIES (Again, as they might appear later)
            await clicker.accept_cookies(page)

            # 3. CAPTURE STATE (Before Action)
            print(f"[Step {step}] Capturing state...")
            screenshot_path = await scraper.capture_screenshot(page, step)
            html_path = await scraper.save_html(page, step)
            markdown_content = await scraper.extract_markdown(page)

            # 4. PERFORM ACTION
            print(f"[Step {step}] Looking for interactions on {page.url}")
            if on_progress:
                await on_progress(
                    {
                        "action": "looking",
                        "message": f"Step {step}: Finding element to click...",
                        "step": step,
                    }
                )

            # Get clean URLs for visited check
            visited_urls = {state.split(":")[0] for state in visited_states}

            # Execute Click
            action_desc = await clicker.click_random(page, initial_domain, visited_urls)
            print(f"[Step {step}] Action: {action_desc}")

            if on_progress:
                await on_progress(
                    {
                        "action": "click",
                        "message": f"Step {step}: {action_desc}",
                        "step": step,
                    }
                )

            # 5. POST-CLICK HANDLING
            # If no elements found, wait and see if it's a redirect/loader
            if action_desc == "No clickable elements found":
                print(
                    f"[Step {step}] ⏳ No elements. Waiting 10s for potential redirect/load..."
                )
                start_url = page.url
                for i in range(10):
                    await page.wait_for_timeout(1000)
                    # Check if URL changed or new elements appeared
                    if page.url != start_url:
                        action_desc = f"Waited {i+1}s and redirected"
                        break
                    # Quick check if something appeared (without full click logic)
                    if await page.query_selector("button, input, a"):
                        # Try clicking again in next loop
                        action_desc = f"Waited {i+1}s, elements appeared"
                        break

                if action_desc == "No clickable elements found":
                    print("❌ Dead end. Stopping.")
                    break

            # 6. RECORD DATA
            reporter.record_step(
                step, page.url, screenshot_path, markdown_content, action_desc
            )

            if on_step_completed:
                await on_step_completed(
                    {
                        "step": step,
                        "url": page.url,
                        "screenshot_path": screenshot_path,
                        "html_path": html_path,
                        "markdown_content": markdown_content,
                        "action_desc": action_desc,
                    }
                )

            # 7. INFINITE LOOP PROTECTION
            if "Failed to click" in action_desc:
                consecutive_failures += 1
                if consecutive_failures >= 3:
                    print("❌ Stuck in loop. Stopping.")
                    break
            else:
                consecutive_failures = 0

            # Mark state as visited
            try:
                page_content = await page.content()
                import hashlib

                page_hash = hashlib.md5(page_content.encode()).hexdigest()
                visited_states.add(f"{page.url}:{page_hash}")
            except:
                visited_states.add(page.url)

        print(f"Funnel run completed. Report: {reporter.md_path}")


def main():
    parser = argparse.ArgumentParser(description="Automated funnel runner")
    parser.add_argument("--url", required=True, help="Starting URL of the funnel")
    parser.add_argument("--config", help="Path to configuration YAML file")
    parser.add_argument(
        "--headless",
        action="store_true",
        default=True,
        help="Run browser in headless mode",
    )
    parser.add_argument(
        "--headed", action="store_true", help="Run browser in headed mode (visible)"
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Enable interactive mode for manual choices",
    )
    parser.add_argument(
        "--max-steps", type=int, default=20, help="Maximum number of steps to execute"
    )
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument(
        "--pause-at", type=int, help="Pause at specific step number for debugging"
    )
    parser.add_argument(
        "--keep-open",
        action="store_true",
        help="Keep browser open after script completes for manual inspection",
    )
    args = parser.parse_args()

    headless_mode = not args.headed if args.headed else args.headless

    asyncio.run(
        run_funnel(
            url=args.url,
            config_path=args.config,
            headless=headless_mode,
            interactive=args.interactive,
            max_steps=args.max_steps,
            debug=args.debug,
            pause_at_step=args.pause_at,
            keep_open=args.keep_open,
        )
    )


if __name__ == "__main__":
    main()
