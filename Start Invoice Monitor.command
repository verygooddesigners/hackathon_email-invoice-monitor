#!/bin/bash
# ============================================================
#  RotoMath — Mac Launcher
#  Double-click this file to start the control panel.
# ============================================================

# Move to the script's directory
cd "$(dirname "$0")"

echo ""
echo "============================================"
echo "  RotoMath — Starting up..."
echo "============================================"
echo ""

# Check for Python 3
if command -v python3 &>/dev/null; then
    PY=python3
elif command -v python &>/dev/null; then
    PY=python
else
    echo "ERROR: Python 3 is not installed."
    echo "Please install Python from https://www.python.org/downloads/"
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

echo "Using: $($PY --version)"

# Check if dependencies are installed
if ! $PY -c "import flask" 2>/dev/null; then
    echo ""
    echo "Installing dependencies (first run only)..."
    echo ""
    $PY -m pip install -r requirements.txt flask --quiet
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Failed to install dependencies."
        echo "Try running manually: $PY -m pip install -r requirements.txt flask"
        echo ""
        read -p "Press Enter to close..."
        exit 1
    fi
    echo "Dependencies installed."
fi

echo ""
echo "Launching control panel in your browser..."
echo ""

$PY control_panel.py
