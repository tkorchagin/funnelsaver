import os
import datetime
import re
from playwright.async_api import Page
from markdownify import markdownify as md
from urllib.parse import urljoin

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
        """Extract the visible HTML content of the page and convert it to Markdown.
        Fixes relative image URLs to absolute URLs.
        """
        html = await page.content()
        current_url = page.url

        # Convert full HTML to markdown; markdownify handles basic tags.
        markdown = md(html, heading_style="ATX")

        # Fix relative image URLs in markdown
        # Pattern: ![alt](relative_path) or [text](relative_path)
        def fix_url(match):
            alt_or_text = match.group(1)
            url = match.group(2)
            # If URL is relative (starts with / or doesn't have protocol), make it absolute
            if url.startswith('/') or (not url.startswith('http://') and not url.startswith('https://')):
                absolute_url = urljoin(current_url, url)
                return f'[{alt_or_text}]({absolute_url})'
            return match.group(0)  # Return unchanged if already absolute

        # Fix both image and link URLs
        markdown = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', fix_url, markdown)  # Images
        markdown = re.sub(r'(?<!\!)\[([^\]]+)\]\(([^)]+)\)', fix_url, markdown)  # Links (but not images)

        return markdown
