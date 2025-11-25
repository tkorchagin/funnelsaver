import asyncio
from playwright.async_api import async_playwright
from .config import Config

class Browser:
    def __init__(self, config: Config):
        self.config = config
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None

    async def __aenter__(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        self.context = await self.browser.new_context(
            viewport=self.config.viewport,
            user_agent=self.config.user_agent,
            device_scale_factor=3,
        )
        self.page = await self.context.new_page()
        return self.page

    async def __aexit__(self, exc_type, exc, tb):
        await self.context.close()
        await self.browser.close()
        await self.playwright.stop()
