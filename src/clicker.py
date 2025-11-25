import random
from playwright.async_api import Page
from urllib.parse import urlparse, urljoin

class Clicker:
    """Utility class to handle automatic interactions on a page.
    It can:
    * Accept common cookie consent banners.
    * Find visible clickable elements (buttons, links, inputs of type submit).
    * Click a random element from the list.
    * Prioritize buttons over links.
    * Stay within the same domain.
    * Avoid backward navigation and unhelpful links.
    """

    COOKIE_SELECTORS = [
        "#onetrust-accept-btn-handler",
        "button:has-text('Accept')",
        "button:has-text('I agree')",
        "button:has-text('Got it')",
        "button:has-text('Accept All')",
        "[id*='cookie'] button",
        "[class*='consent'] button",
        "[id*='onetrust'] button",
    ]

    # Prioritized selectors: buttons first, then links
    BUTTON_SELECTORS = [
        "button",
        "[role='button']",
        "input[type='submit']",
        "input[type='button']",
        "[data-testid*='button']",  # Elements with data-testid containing "button"
        "div[onclick]",  # Div elements with click handlers
    ]

    LINK_SELECTORS = [
        "a",
    ]

    # Exclude selectors that likely navigate backwards or to unhelpful pages
    EXCLUDE_PATTERNS = [
        "back", "назад", "previous", "prev",
        "help", "помощь", "support", "поддержка",
        "logo", "логотип", "home", "главная",
        "privacy", "terms", "cookie", "policy"
    ]

    async def accept_cookies(self, page: Page) -> bool:
        """Detect and click a cookie acceptance button if present.
        Returns True if a button was clicked.
        """
        for selector in self.COOKIE_SELECTORS:
            try:
                element = await page.query_selector(selector)
                if element and await element.is_visible():
                    await element.click(timeout=5000)
                    await page.wait_for_timeout(1000)  # Wait for cookie banner to disappear
                    return True
            except Exception:
                continue
        return False

    async def _is_same_domain(self, element, initial_domain: str) -> bool:
        """Check if a link stays within the initial domain."""
        try:
            href = await element.get_attribute("href")
            if not href:
                return True  # No href means it's probably a button
            if href.startswith('#') or href.startswith('/'):
                return True  # Relative link or anchor
            parsed = urlparse(href)
            if not parsed.netloc:
                return True  # No domain means relative link

            # Normalize domains for comparison (remove www.)
            link_domain = parsed.netloc.replace("www.", "")
            init_domain = initial_domain.replace("www.", "")

            # Must match the initial domain exactly
            return link_domain == init_domain
        except Exception:
            return False  # If we can't check, don't allow it

    async def _should_exclude_element(self, element) -> bool:
        """Check if element should be excluded based on text/attributes."""
        try:
            # Check text content
            text = await element.inner_text()
            text_lower = text.lower().strip()

            # Check href attribute
            href = await element.get_attribute("href")
            href_lower = href.lower() if href else ""

            # Check all attributes for excluded patterns
            for pattern in self.EXCLUDE_PATTERNS:
                if pattern in text_lower or pattern in href_lower:
                    return True

            # Exclude very short or empty text buttons that might be navigation
            if len(text_lower) < 1:
                return True

            return False
        except Exception:
            return False

    async def _visible_clickables(self, page: Page, initial_domain: str, visited_urls: set, prioritize_buttons: bool = True):
        """Get visible clickable elements, with optional button prioritization."""
        current_url = page.url
        buttons = []
        links = []

        # Get all buttons first
        for selector in self.BUTTON_SELECTORS:
            try:
                found = await page.query_selector_all(selector)
                for el in found:
                    if await el.is_visible() and not await self._should_exclude_element(el):
                        buttons.append(el)
            except Exception:
                continue

        # Get links that stay within the initial domain and haven't been visited
        for selector in self.LINK_SELECTORS:
            try:
                found = await page.query_selector_all(selector)
                for el in found:
                    if await el.is_visible() and not await self._should_exclude_element(el):
                        if await self._is_same_domain(el, initial_domain):
                            # Check if link leads to already visited URL
                            href = await el.get_attribute("href")
                            if href:
                                # Construct full URL
                                full_url = urljoin(current_url, href)
                                if full_url not in visited_urls:
                                    links.append(el)
                            else:
                                links.append(el)
            except Exception:
                continue

        # If prioritizing buttons and buttons exist, return only buttons
        if prioritize_buttons and buttons:
            return buttons
        # Otherwise return buttons + links
        return buttons + links

    async def click_random(self, page: Page, initial_domain: str, visited_urls: set) -> str:
        """Click a random visible clickable element.
        Prioritizes buttons over links and stays within the initial domain.
        Returns a description of the action performed.
        """
        elements = await self._visible_clickables(page, initial_domain, visited_urls, prioritize_buttons=True)
        if not elements:
            return "No clickable elements found"
        element = random.choice(elements)
        # Try to get a readable description
        try:
            text = await element.inner_text()
            desc = f"clicked element with text '{text.strip()}'"
        except Exception:
            desc = "clicked an element"
        try:
            await element.click(timeout=10000)
            await page.wait_for_timeout(1000)  # Wait for page to update
        except Exception as e:
            # If click fails, try with force
            try:
                await element.click(force=True, timeout=5000)
                await page.wait_for_timeout(1000)
            except Exception:
                return f"Failed to click element: {desc}"
        return desc
