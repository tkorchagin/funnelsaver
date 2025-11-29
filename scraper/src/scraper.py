import os
import datetime
import re
import base64
from playwright.async_api import Page
from markdownify import markdownify as md
from urllib.parse import urljoin
import aiohttp

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

    async def extract_metadata(self, page: Page) -> dict:
        """Extract page metadata: title, description, and favicon.
        Returns a dictionary with 'title', 'description', and 'favicon_url'.
        """
        metadata = await page.evaluate("""() => {
            // Extract title
            let title = document.title || '';

            // Try og:title first, fallback to title tag
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle && ogTitle.content) {
                title = ogTitle.content;
            }

            // Extract description
            let description = '';
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc && metaDesc.content) {
                description = metaDesc.content;
            }

            // Try og:description as fallback
            if (!description) {
                const ogDesc = document.querySelector('meta[property="og:description"]');
                if (ogDesc && ogDesc.content) {
                    description = ogDesc.content;
                }
            }

            // Extract favicon/icon URLs with priority:
            // 1. apple-touch-icon (usually highest quality)
            // 2. icon with sizes
            // 3. shortcut icon / icon
            // 4. og:image
            let iconUrl = '';

            // Try apple-touch-icon first (best quality)
            const appleTouchIcon = document.querySelector('link[rel*="apple-touch-icon"]');
            if (appleTouchIcon && appleTouchIcon.href) {
                iconUrl = appleTouchIcon.href;
            }

            // Try icon with sizes
            if (!iconUrl) {
                const iconWithSizes = document.querySelector('link[rel="icon"][sizes]');
                if (iconWithSizes && iconWithSizes.href) {
                    iconUrl = iconWithSizes.href;
                }
            }

            // Try regular icon/shortcut icon
            if (!iconUrl) {
                const icon = document.querySelector('link[rel*="icon"]');
                if (icon && icon.href) {
                    iconUrl = icon.href;
                }
            }

            // Fallback to og:image if no favicon found
            if (!iconUrl) {
                const ogImage = document.querySelector('meta[property="og:image"]');
                if (ogImage && ogImage.content) {
                    iconUrl = ogImage.content;
                }
            }

            // Last resort: try /favicon.ico
            if (!iconUrl) {
                iconUrl = '/favicon.ico';
            }

            return {
                title: title,
                description: description,
                favicon_url: iconUrl
            };
        }""")

        # Convert relative favicon URL to absolute
        if metadata['favicon_url']:
            metadata['favicon_url'] = urljoin(page.url, metadata['favicon_url'])

        return metadata

    async def download_favicon(self, favicon_url: str, project_id: int) -> str:
        """Download favicon and save it to the project directory.
        Returns the relative file path of the saved favicon.
        """
        if not favicon_url:
            return None

        try:
            # Determine file extension from URL or default to .png
            ext = '.png'
            if favicon_url.endswith('.ico'):
                ext = '.ico'
            elif favicon_url.endswith('.jpg') or favicon_url.endswith('.jpeg'):
                ext = '.jpg'
            elif favicon_url.endswith('.svg'):
                ext = '.svg'

            filename = f"favicon{ext}"
            filepath = os.path.join(self.output_dir, filename)

            # Download the favicon
            async with aiohttp.ClientSession() as session:
                async with session.get(favicon_url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        content = await response.read()
                        with open(filepath, 'wb') as f:
                            f.write(content)
                        return filename
        except Exception as e:
            print(f"Failed to download favicon from {favicon_url}: {e}")
            return None

        return None
