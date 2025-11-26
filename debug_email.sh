#!/bin/bash

# Debug script to quickly test email page
# This will run the funnel and pause at step 46 (around email page)

source .venv/bin/activate

echo "🔍 Starting debug mode..."
echo "Will pause at step 46 (email page)"
echo ""
echo "When paused, you can:"
echo "  - Inspect Network tab in DevTools"
echo "  - Manually click buttons"
echo "  - Check console for errors"
echo "  - Use 'Resume' in Playwright Inspector to continue"
echo ""
echo "Browser will stay open after completion for manual inspection"
echo "Press Ctrl+C to close browser and exit"
echo ""

python -m src.main \
  --url "https://appnebula.co/moon-compatibility/prelanding" \
  --headed \
  --pause-at 46 \
  --max-steps 50 \
  --keep-open
