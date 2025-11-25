#!/usr/bin/env bash

# Exit on any error
set -e

# Ensure Python 3.13 is installed (macOS default may have older version)
PYTHON=python3.13
if ! command -v $PYTHON &> /dev/null; then
  echo "Python 3.13 not found. Please install it first (e.g., via pyenv)."
  exit 1
fi

# Create virtual environment in .venv directory
$PYTHON -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install Playwright browsers
playwright install

echo "Virtual environment setup complete. Activate with 'source .venv/bin/activate'"
