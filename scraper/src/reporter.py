import os
import json
import datetime
from urllib.parse import urlparse

class Reporter:
    """Handles incremental Markdown and JSON reporting for each funnel step.
    Creates/initializes files at start and appends after each captured step.
    """

    def __init__(self, url: str, output_dir: str = "outputs", use_subdirectory: bool = True):
        # Extract domain from URL
        parsed = urlparse(url)
        domain = parsed.netloc.replace('www.', '').replace('.', '_')
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

        # Create directory for this specific run
        if use_subdirectory:
            self.run_dir = os.path.join(output_dir, f"{domain}_{timestamp}")
        else:
            # Use output_dir directly without subdirectory
            self.run_dir = output_dir
        os.makedirs(self.run_dir, exist_ok=True)

        # Create README.md with URL info
        readme_path = os.path.join(self.run_dir, "README.md")
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(f"# Funnel Report\n\n")
            f.write(f"**URL:** {url}\n\n")
            f.write(f"**Domain:** {parsed.netloc}\n\n")
            f.write(f"**Started:** {timestamp}\n\n")

        self.md_path = os.path.join(self.run_dir, f"funnel_report.md")
        self.json_path = os.path.join(self.run_dir, f"funnel_data.json")

        # Initialize files
        with open(self.md_path, "w", encoding="utf-8") as f_md:
            f_md.write(f"# Funnel Report – {timestamp}\n\n")
        with open(self.json_path, "w", encoding="utf-8") as f_json:
            json.dump([], f_json, indent=2)
        self.steps = []

    def _append_markdown(self, step_num: int, url: str, screenshot_path: str, markdown_content: str, action: str):
        # Ensure absolute path for screenshot
        abs_screenshot_path = os.path.abspath(screenshot_path)
        
        # Append to main report
        with open(self.md_path, "a", encoding="utf-8") as f_md:
            f_md.write(f"## Step {step_num}\n")
            f_md.write(f"**URL:** {url}\n\n")
            f_md.write(f"**Action:** {action}\n\n")
            f_md.write(f"![Screenshot]({abs_screenshot_path})\n\n")
            f_md.write(f"{markdown_content}\n\n---\n\n")

        # Create individual step file
        step_file = os.path.join(self.run_dir, f"step_{step_num}.md")
        with open(step_file, "w", encoding="utf-8") as f_step:
            f_step.write(f"# Step {step_num}\n\n")
            f_step.write(f"**URL:** {url}\n\n")
            f_step.write(f"**Action:** {action}\n\n")
            f_step.write(f"![Screenshot]({abs_screenshot_path})\n\n")
            f_step.write(f"## Page Content\n\n")
            f_step.write(f"{markdown_content}\n")

    def _write_json(self):
        with open(self.json_path, "w", encoding="utf-8") as f_json:
            json.dump(self.steps, f_json, indent=2, ensure_ascii=False)

    def record_step(self, step_num: int, url: str, screenshot_path: str, markdown_content: str, action: str):
        """Record a step both in markdown and JSON.
        This method is crash‑resilient: it updates the JSON file after each call.
        """
        entry = {
            "step": step_num,
            "url": url,
            "screenshot": screenshot_path,
            "markdown": markdown_content,
            "action": action,
            "timestamp": datetime.datetime.now().isoformat(),
        }
        self.steps.append(entry)
        self._append_markdown(step_num, url, screenshot_path, markdown_content, action)
        self._write_json()
