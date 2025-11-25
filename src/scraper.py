import os
import datetime
from playwright.async_api import Page
from markdownify import markdownify as md

class Scraper:
    """Handles screenshot capture and HTML-to-Markdown extraction for a page."""

    def __init__(self, output_dir: str = None):
        self.output_dir = output_dir

    async def capture_screenshot(self, page: Page, step: int) -> str:
        """Capture a screenshot of the current page.
        Returns the file path of the saved screenshot.
        """
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"step_{step}_{timestamp}.png"
        path = os.path.join(self.output_dir, filename)
        await page.screenshot(path=path, full_page=True)
        return path

    async def save_html(self, page: Page, step: int) -> str:
        """Save the HTML content of the page for debugging.
        Returns the file path of the saved HTML.
        """
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"step_{step}_{timestamp}.html"
        path = os.path.join(self.output_dir, filename)
        html = await page.content()
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        return path

    async def extract_markdown(self, page: Page) -> str:
        """Extract the visible HTML content of the page and convert it to Markdown."""
        html = await page.content()
        # Convert full HTML to markdown; markdownify handles basic tags.
        markdown = md(html, heading_style="ATX")
        return markdown
