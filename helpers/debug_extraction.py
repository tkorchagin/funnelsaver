import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from playwright.async_api import async_playwright
from src.scraper import Scraper

async def test_extraction():
    html_path = os.path.abspath("outputs/quiz_blessedpaths_com_20251127_132218/step_18_20251127_132319.html")
    file_url = f"file://{html_path}"
    
    print(f"Testing extraction on: {file_url}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(file_url)
        
        # Mock the URL to be the real website URL so relative links are resolved correctly
        await page.evaluate("history.replaceState(null, '', 'https://quiz.blessedpaths.com/mostInspired')")
        
        scraper = Scraper()
        markdown = await scraper.extract_markdown(page)
        
        print("\n--- Extracted Markdown ---\n")
        print(markdown)
        print("\n--------------------------\n")

        # Compare with BeautifulSoup text extraction
        from bs4 import BeautifulSoup
        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')
        # Remove scripts and styles
        for script in soup(["script", "style", "noscript", "svg", "iframe", "link", "meta"]):
            script.decompose()
        text = soup.get_text(separator='\n', strip=True)
        print("\n--- BeautifulSoup Text ---\n")
        print(text)
        print("\n--------------------------\n")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_extraction())
