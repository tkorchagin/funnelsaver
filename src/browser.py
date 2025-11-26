import asyncio
from playwright.async_api import async_playwright
from .config import Config

class Browser:
    def __init__(self, config: Config, headless: bool = True, slow_mo: int = 0, keep_open: bool = False):
        self.config = config
        self.headless = headless
        self.slow_mo = slow_mo
        self.keep_open = keep_open
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None

    async def __aenter__(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            slow_mo=self.slow_mo  # milliseconds to slow down operations
        )
        self.context = await self.browser.new_context(
            viewport=self.config.viewport,
            user_agent=self.config.user_agent,
            device_scale_factor=3,
        )
        self.page = await self.context.new_page()
        return self.page

    async def __aexit__(self, exc_type, exc, tb):
        await self.context.close()
        if not self.keep_open:
            await self.browser.close()
            await self.playwright.stop()
        else:
            print("\n🔍 Browser kept open for manual inspection")
            print("Press Ctrl+C to close the browser and exit")
            try:
                # Keep browser open indefinitely until user interrupts
                await asyncio.sleep(3600)  # Sleep for 1 hour
            except KeyboardInterrupt:
                print("\n👋 Closing browser...")
            finally:
                await self.browser.close()
                await self.playwright.stop()
