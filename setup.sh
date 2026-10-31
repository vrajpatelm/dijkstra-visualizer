#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  Dijkstra Visualizer - Automated Unix/Linux/macOS Setup"
echo "========================================================"

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 could not be found. Please install Python 3.10+."
    exit 1
fi

# 2. Virtual Environment
if [ ! -d ".venv" ]; then
    echo "[INFO] Creating virtual environment (.venv)..."
    python3 -m venv .venv
else
    echo "[INFO] Virtual environment .venv exists."
fi

# 3. Activate
source .venv/bin/activate

# 4. Install dependencies
echo "[INFO] Installing requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

# 5. Check Django
echo "[INFO] Validating Django project..."
python manage.py check

echo "========================================================"
echo "  Setup complete!"
echo "  To run: source .venv/bin/activate && python manage.py runserver 8000"
echo "  URL: http://127.0.0.1:8000/"
echo "========================================================"

if [ "$1" == "--run" ]; then
    python manage.py runserver 8000
fi

