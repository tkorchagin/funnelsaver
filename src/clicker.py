import random
from playwright.async_api import Page
from urllib.parse import urlparse, urljoin

class Clicker:
    """Utility class to handle automatic interactions on a page.
    It can:
    * Accept common cookie consent banners.
    * Auto-fill form fields before clicking Next/Submit.
    * Find visible clickable elements (buttons, links, inputs of type submit).
    * Check if buttons are enabled (not disabled).
    * Prioritize "Next" buttons over others.
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

    # Priority keywords for buttons (highest priority)
    PRIORITY_KEYWORDS = ["next", "continue", "далее", "продолжить", "submit", "send"]

    # Default form values
    DEFAULT_FORM_VALUES = {
        "name": "Alex Johnson",
        "email": "test@example.com",
        "phone": "+1234567890",
        "message": "Test message",
        "text": "Test input"
    }

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

    async def fill_forms(self, page: Page) -> int:
        """Auto-fill visible form fields with default values.
        Returns the number of fields filled.
        """
        filled_count = 0

        # Find all input fields
        input_selectors = [
            'input[type="text"]',
            'input[type="email"]',
            'input[type="tel"]',
            'input[type="number"]',
            'input:not([type])',  # inputs without type
            'textarea',
            '[data-testid*="input"]',
        ]

        for selector in input_selectors:
            try:
                inputs = await page.query_selector_all(selector)
                for input_el in inputs:
                    # Skip if hidden or already filled
                    if not await input_el.is_visible():
                        continue

                    current_value = await input_el.input_value()
                    if current_value:  # Already has value
                        continue

                    # Determine what to fill based on attributes
                    placeholder = await input_el.get_attribute("placeholder") or ""
                    name_attr = await input_el.get_attribute("name") or ""
                    testid = await input_el.get_attribute("data-testid") or ""
                    input_type = await input_el.get_attribute("type") or "text"

                    # Determine appropriate value
                    value = None
                    combined_text = (placeholder + " " + name_attr + " " + testid).lower()

                    if input_type == "email" or "email" in combined_text or "e-mail" in combined_text:
                        value = self.DEFAULT_FORM_VALUES["email"]
                    elif input_type == "tel" or "phone" in combined_text or "tel" in combined_text:
                        value = self.DEFAULT_FORM_VALUES["phone"]
                    elif "name" in combined_text:
                        value = self.DEFAULT_FORM_VALUES["name"]
                    elif "message" in combined_text or "comment" in combined_text:
                        value = self.DEFAULT_FORM_VALUES["message"]
                    else:
                        value = self.DEFAULT_FORM_VALUES["text"]

                    if value:
                        await input_el.fill(value)
                        filled_count += 1
                        await page.wait_for_timeout(300)  # Small delay between fills
            except Exception:
                continue

        # Fill select dropdowns (date pickers, etc.)
        try:
            selects = await page.query_selector_all('select')
            for select_el in selects:
                if not await select_el.is_visible():
                    continue

                name_attr = await select_el.get_attribute("name") or ""
                id_attr = await select_el.get_attribute("id") or ""
                combined = (name_attr + " " + id_attr).lower()

                # Get all options
                options = await select_el.query_selector_all('option')
                if len(options) < 2:  # Must have at least one non-default option
                    continue

                # Check current value
                current_value = await select_el.evaluate("el => el.value")
                if current_value and current_value != "":  # Already selected
                    continue

                # Select based on field type
                if "month" in combined:
                    # Pick a random month
                    await select_el.select_option(index=random.randint(1, min(12, len(options) - 1)))
                    filled_count += 1
                elif "day" in combined:
                    # Pick a random day (1-28 to avoid month-specific issues)
                    await select_el.select_option(index=random.randint(1, min(28, len(options) - 1)))
                    filled_count += 1
                elif "year" in combined:
                    # Pick a year around 1990 (middle of the list)
                    middle_idx = len(options) // 2
                    await select_el.select_option(index=random.randint(max(1, middle_idx - 5), min(len(options) - 1, middle_idx + 5)))
                    filled_count += 1
                elif "hour" in combined:
                    # Pick a random hour (avoiding edges - 3 to 9)
                    max_hour_idx = min(9, len(options) - 1)
                    await select_el.select_option(index=random.randint(3, max_hour_idx))
                    filled_count += 1
                elif "minute" in combined:
                    # Pick a random minute (any value)
                    await select_el.select_option(index=random.randint(0, len(options) - 1))
                    filled_count += 1
                elif "part" in combined or "ampm" in combined or "meridiem" in combined:
                    # Pick AM or PM randomly
                    await select_el.select_option(index=random.randint(0, min(1, len(options) - 1)))
                    filled_count += 1
                else:
                    # For unknown selects, pick a random non-default option
                    await select_el.select_option(index=random.randint(0, len(options) - 1))
                    filled_count += 1

                await page.wait_for_timeout(300)  # Small delay between fills
        except Exception:
            pass

        return filled_count

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

    async def _is_button_enabled(self, element) -> bool:
        """Check if button is enabled (not disabled)."""
        try:
            disabled = await element.get_attribute("disabled")
            aria_disabled = await element.get_attribute("aria-disabled")

            # Check if explicitly disabled
            if disabled is not None or aria_disabled == "true":
                return False

            # Check classes for disabled state
            class_attr = await element.get_attribute("class") or ""
            if "disabled" in class_attr.lower():
                return False

            return True
        except Exception:
            return True  # If we can't check, assume enabled

    async def _has_priority_keyword(self, element) -> bool:
        """Check if element text contains priority keywords like 'Next'."""
        try:
            text = await element.inner_text()
            text_lower = text.lower().strip()

            for keyword in self.PRIORITY_KEYWORDS:
                if keyword in text_lower:
                    return True
            return False
        except Exception:
            return False

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
        priority_buttons = []  # Buttons with "Next", "Continue", etc.
        regular_buttons = []
        links = []

        # Get all buttons first
        for selector in self.BUTTON_SELECTORS:
            try:
                found = await page.query_selector_all(selector)
                for el in found:
                    # Check visibility, enabled state, and exclusions
                    if not await el.is_visible():
                        continue
                    if not await self._is_button_enabled(el):
                        continue
                    if await self._should_exclude_element(el):
                        continue

                    # Prioritize buttons with "Next", "Continue" keywords
                    if await self._has_priority_keyword(el):
                        priority_buttons.append(el)
                    else:
                        regular_buttons.append(el)
            except Exception:
                continue

        # Get links that stay within the initial domain and haven't been visited
        for selector in self.LINK_SELECTORS:
            try:
                found = await page.query_selector_all(selector)
                for el in found:
                    if not await el.is_visible():
                        continue
                    if await self._should_exclude_element(el):
                        continue
                    if not await self._is_same_domain(el, initial_domain):
                        continue

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

        # Return in priority order
        if priority_buttons:
            return priority_buttons
        if prioritize_buttons and regular_buttons:
            return regular_buttons
        # Otherwise return buttons + links
        return regular_buttons + links

    async def click_random(self, page: Page, initial_domain: str, visited_urls: set) -> str:
        """Click a random visible clickable element.
        Auto-fills forms before clicking.
        Prioritizes buttons over links and stays within the initial domain.
        Returns a description of the action performed.
        """
        # First, try to fill any forms on the page
        filled = await self.fill_forms(page)
        if filled > 0:
            await page.wait_for_timeout(500)  # Wait for form validation

        # Get clickable elements
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
