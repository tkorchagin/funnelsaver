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
        "[class*='SelectBox']",  # Survey option boxes
        "[id^='select-']",  # Elements with id starting with 'select-'
        "[class*='option']",
        "[class*='answer']",
        "[class*='card']",
        "[class*='item']",
        "label:has(input[type='radio'])", # Labels wrapping radios
        "label:has(input[type='checkbox'])", # Labels wrapping checkboxes
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

    # Default form values (fallback if not in config)
    DEFAULT_FORM_VALUES = {
        "name": "Alex Johnson",
        "email": "alexjohnson.test@gmail.com",
        "phone": "+1234567890",
        "message": "Test message",
        "location": "San Francisco",
        "text": "Test input",
        "height": "170",  # cm
        "weight": "70",   # kg
        "goal_weight": "65",  # kg
        "age": "30",
        "gender": "female",
        "birth_year": "1994",
        "birth_month": "6",
        "birth_day": "15",
        "birth_hour": "9",
        "birth_minute": "12",
        "birth_ampm": "AM",
        "steps": "5000"
    }

    def __init__(self, config=None):
        """Initialize Clicker with optional config.
        If config is provided, use its default_form_values merged with defaults.
        """
        self.form_values = self.DEFAULT_FORM_VALUES.copy()
        if config and hasattr(config, 'default_form_values'):
            # Merge config values with defaults (config takes precedence)
            self.form_values.update(config.default_form_values)
        print(f"DEBUG: Using form values: {self.form_values}")

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
            'textarea',
            '[data-testid*="input"]',
            '[data-testid="email-input"]',  # Explicit selector for Nebula email
        ]

        print(f"DEBUG: Found {len(input_selectors)} selector types")

        for selector in input_selectors:
            try:
                inputs = await page.query_selector_all(selector)
                print(f"DEBUG: Selector '{selector}' found {len(inputs)} elements")
                for input_el in inputs:
                    # Skip if hidden or already filled
                    is_visible = await input_el.is_visible()
                    if not is_visible:
                        print(f"DEBUG: Element skipped (not visible)")
                        continue

                    current_value = await input_el.input_value()
                    if current_value:  # Already has value
                        print(f"DEBUG: Element skipped (already has value: '{current_value}')")
                        continue

                    # Determine what to fill based on attributes
                    placeholder = await input_el.get_attribute("placeholder") or ""
                    name_attr = await input_el.get_attribute("name") or ""
                    testid = await input_el.get_attribute("data-testid") or ""
                    input_type = await input_el.get_attribute("type") or "text"

                    # Determine appropriate value
                    value = None
                    combined_text = (placeholder + " " + name_attr + " " + testid).lower()
                    is_email_field = input_type == "email" or "email" in combined_text or "e-mail" in combined_text or "mail" in combined_text
                    
                    print(f"DEBUG: Processing input: type={input_type}, placeholder='{placeholder}', name='{name_attr}', testid='{testid}', is_email={is_email_field}")

                    if is_email_field:
                        value = self.form_values["email"]
                    elif input_type == "tel" or "phone" in combined_text or "tel" in combined_text:
                        value = self.form_values["phone"]
                    elif "height" in combined_text or "рост" in combined_text:
                        value = self.form_values["height"]
                    elif "goal" in combined_text and "weight" in combined_text:
                        # Goal weight should be checked before regular weight
                        value = self.form_values.get("goal_weight", self.form_values["weight"])
                    elif "weight" in combined_text or "вес" in combined_text:
                        value = self.form_values["weight"]
                    elif "age" in combined_text or "возраст" in combined_text:
                        value = self.form_values["age"]
                    elif "location" in combined_text or "place" in combined_text or "city" in combined_text or "where" in combined_text:
                        value = self.form_values["location"]
                    elif "name" in combined_text:
                        value = self.form_values["name"]
                    elif "message" in combined_text or "comment" in combined_text:
                        value = self.form_values["message"]
                    elif input_type == "number":
                        # Generic number input - use age as default
                        value = self.form_values["age"]
                    else:
                        value = self.form_values["text"]

                    if value:
                        # Use fill() immediately to avoid triggering validation for every character (which causes 429s)
                        if is_email_field:
                            print(f"DEBUG: Attempting to fill email field with '{value}' using fill()")
                            try:
                                await input_el.fill(value)
                                await page.wait_for_timeout(500)
                                # Dispatch events to ensure React/frameworks pick it up
                                await input_el.dispatch_event("input")
                                await input_el.dispatch_event("change")
                            except Exception as e:
                                print(f"DEBUG: fill() failed: {e}")
                                print(f"DEBUG: Trying fallback to press_sequentially()")
                                try:
                                    await input_el.click()
                                    await input_el.press_sequentially(value, delay=10) # Faster typing
                                except Exception as e2:
                                    print(f"DEBUG: press_sequentially failed: {e2}")

                            # Verify if filled
                            new_val = await input_el.input_value()
                            print(f"DEBUG: Value after filling attempts: '{new_val}'")
                            
                            await page.wait_for_timeout(2000)  # Wait for validation
                        else:
                            print(f"DEBUG: Filling field with '{value}' using fill()")
                            await input_el.fill(value)
                            await page.wait_for_timeout(2000)  # 2 seconds for autocomplete dropdown
                        filled_count += 1

                        # Check if autocomplete dropdown appeared and click first suggestion
                        try:
                            # Common autocomplete selectors
                            autocomplete_selectors = [
                                '[class*="autocomplete"]',
                                '[class*="suggestion"]',
                                '[class*="dropdown"]',
                                '[role="option"]',
                                '[role="listbox"] > div',
                                'div[class*="cadb210c-0"]',  # Specific for this site
                            ]

                            for ac_selector in autocomplete_selectors:
                                suggestions = await page.query_selector_all(ac_selector)
                                if suggestions and len(suggestions) > 0:
                                    first_suggestion = suggestions[0]
                                    if await first_suggestion.is_visible():
                                        await first_suggestion.click(timeout=2000)
                                        await page.wait_for_timeout(1000)  # Wait for button to enable
                                        break
                        except Exception:
                            pass  # No autocomplete, continue

                        await page.wait_for_timeout(500)  # Longer delay after autocomplete interaction
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

        # Check all visible checkboxes that are not already checked
        try:
            checkboxes = await page.query_selector_all('input[type="checkbox"]')
            print(f"DEBUG: Found {len(checkboxes)} checkboxes")
            for checkbox in checkboxes:
                try:
                    # Skip if not visible
                    if not await checkbox.is_visible():
                        continue
                    
                    # Skip cookie consent and other system checkboxes
                    checkbox_id = await checkbox.get_attribute("id") or ""
                    checkbox_class = await checkbox.get_attribute("class") or ""
                    if "onetrust" in checkbox_id.lower() or "cookie" in checkbox_id.lower():
                        continue
                    if "onetrust" in checkbox_class.lower() or "cookie" in checkbox_class.lower():
                        continue
                    
                    # Check if already checked
                    is_checked = await checkbox.is_checked()
                    if not is_checked:
                        print(f"DEBUG: Checking checkbox: id='{checkbox_id}', class='{checkbox_class}'")
                        await checkbox.check()
                        filled_count += 1
                        await page.wait_for_timeout(300)
                except Exception as e:
                    print(f"DEBUG: Error checking checkbox: {e}")
                    continue
        except Exception as e:
            print(f"DEBUG: Error processing checkboxes: {e}")

        # Handle radio buttons (e.g., gender selection)
        try:
            radios = await page.query_selector_all('input[type="radio"]')
            print(f"DEBUG: Found {len(radios)} radio buttons")
            
            # Group radios by name
            radio_groups = {}
            for radio in radios:
                name = await radio.get_attribute("name")
                if name:
                    if name not in radio_groups:
                        radio_groups[name] = []
                    radio_groups[name].append(radio)
            
            target_gender = self.form_values.get("gender", "female").lower()
            
            for name, group in radio_groups.items():
                # Check if this group is likely about gender
                is_gender_group = "gender" in name.lower() or "sex" in name.lower()
                
                # If not explicitly named gender, check values
                if not is_gender_group:
                    for radio in group:
                        val = await radio.get_attribute("value") or ""
                        if val.lower() in ["male", "female", "man", "woman"]:
                            is_gender_group = True
                            break
                
                selected_radio = None
                if is_gender_group:
                    print(f"DEBUG: Processing gender radio group: {name}")
                    for radio in group:
                        val = await radio.get_attribute("value") or ""
                        val_lower = val.lower()
                        
                        # Check if this radio matches our target gender
                        if target_gender in ["female", "woman"] and val_lower in ["female", "woman"]:
                            selected_radio = radio
                            break
                        elif target_gender in ["male", "man"] and val_lower in ["male", "man"]:
                            selected_radio = radio
                            break
                else:
                    # Random selection for non-gender groups
                    print(f"DEBUG: Processing random radio group: {name}")
                    if group:
                        selected_radio = random.choice(group)

                if selected_radio:
                    try:
                        # Try to click the radio or its label
                        clicked = False
                        if await selected_radio.is_visible():
                            await selected_radio.click(timeout=1000)
                            clicked = True
                        else:
                            # If radio is hidden, try clicking parent label
                            print("DEBUG: Radio not visible, trying to click parent label")
                            # Try JS click on label
                            await selected_radio.evaluate("el => el.closest('label') && el.closest('label').click()")
                            clicked = True
                        
                        if clicked:
                            filled_count += 1
                            await page.wait_for_timeout(500)
                    except Exception as e:
                        print(f"DEBUG: Error clicking radio: {e}")
                        # Fallback: try clicking parent label via JS if standard click failed
                        try:
                            await selected_radio.evaluate("el => el.closest('label') && el.closest('label').click()")
                            filled_count += 1
                        except:
                            pass
        except Exception as e:
            print(f"DEBUG: Error processing radio buttons: {e}")

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

        # After filling forms/selecting options, check if Submit/Continue button is now enabled
        # Wait up to 5 seconds for submit button to become enabled
        submit_clicked = False
        for attempt in range(10):  # 10 attempts * 500ms = 5 seconds
            elements = await self._visible_clickables(page, initial_domain, visited_urls, prioritize_buttons=True)

            # Check if any priority button (Submit, Continue, Next) is now enabled
            for el in elements:
                if await self._has_priority_keyword(el) and await self._is_button_enabled(el):
                    try:
                        text = await el.inner_text()
                        desc = f"Selected options and clicked '{text.strip()}'"
                        await el.click(timeout=10000)
                        await page.wait_for_timeout(1000)
                        return desc
                    except Exception:
                        try:
                            await el.click(force=True, timeout=5000)
                            await page.wait_for_timeout(1000)
                            return desc
                        except Exception:
                            pass

            # If no enabled submit button found yet, wait and try again
            await page.wait_for_timeout(500)

        # If no submit button was found/clicked, proceed with normal random click
        elements = await self._visible_clickables(page, initial_domain, visited_urls, prioritize_buttons=True)
        if not elements:
            if filled > 0:
                return "Filled forms / selected options"
            return "No clickable elements found"

        element = random.choice(elements)

        # Try to get a readable description
        try:
            text = await element.inner_text()
            desc = f"clicked element with text '{text.strip()}'"
        except Exception:
            desc = "clicked an element"

        if filled > 0:
            desc = f"Filled forms and {desc}"

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
