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
        filename = f"step_{step}.png"
        path = os.path.join(self.output_dir, filename)
        await page.screenshot(path=path, full_page=True)
        return path

    async def save_html(self, page: Page, step: int) -> str:
        """Save the HTML content of the page for debugging.
        Returns the file path of the saved HTML.
        """
        filename = f"step_{step}.html"
        path = os.path.join(self.output_dir, filename)
        html = await page.content()
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        return path

    async def extract_markdown(self, page: Page) -> str:
        """Extract the visible HTML content of the page and convert it to Markdown.
        Fixes relative image URLs to absolute URLs.
        """
        # Get content via evaluation to ensure we get the current DOM state
        # and remove hidden elements which might clutter the output
        html = await page.evaluate("""() => {
            const clone = document.documentElement.cloneNode(true);
            
            // Remove scripts, styles, and other non-visible elements
            const toRemove = clone.querySelectorAll('script, style, noscript, svg, iframe, link, meta');
            toRemove.forEach(el => el.remove());
            
            // Remove hidden elements (simple check)
            const allElements = clone.querySelectorAll('*');
            allElements.forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                    el.remove();
                }
            });
            
            return clone.outerHTML;
        }""")
        
        current_url = page.url

        # Convert cleaned HTML to markdown
        # strip=['a'] ensures links are kept but maybe we want to keep them
        # newline_style='BACKSLASH' handles line breaks better
        markdown = md(html, heading_style="ATX", strip=['script', 'style'])

        # Fix relative image URLs in markdown
        # Pattern: ![alt](relative_path) or [text](relative_path)
        def fix_url(match):
            prefix = match.group(1) # ![ or [
            alt_or_text = match.group(2)
            url = match.group(3)
            
            # If URL is relative (starts with / or doesn't have protocol), make it absolute
            if url and (url.startswith('/') or (not url.startswith('http://') and not url.startswith('https://') and not url.startswith('data:'))):
                absolute_url = urljoin(current_url, url)
                return f'{prefix}{alt_or_text}]({absolute_url})'
            return match.group(0)  # Return unchanged if already absolute

        # Fix both image and link URLs with a more robust regex
        # Matches ![alt](url) or [text](url)
        markdown = re.sub(r'(!?\[)([^\]]*)\]\(([^)]+)\)', fix_url, markdown)

        return markdown
