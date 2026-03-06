#!/bin/bash
# Run rb2b dev server — ensures we're in rb2b-audience-lab
cd "$(dirname "$0")"
if [[ ! -f "package.json" ]] || ! grep -q '"name": "rb2b-audience-lab"' package.json 2>/dev/null; then
  echo "Error: Not in rb2b-audience-lab. Run from the rb2b project directory."
  exit 1
fi
echo "rb2b-audience-lab @ $(pwd)"
npm run dev
