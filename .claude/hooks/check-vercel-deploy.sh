#!/usr/bin/env bash
# Blocks bare `vercel --prod` unless run from web/ or app/.
# Reads the bash command from stdin as JSON: {"command": "..."}

INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('command',''))" 2>/dev/null)

# Only intercept if this looks like a vercel production deploy
if echo "$CMD" | grep -qE 'vercel\s+--prod|vercel\s+deploy.*--prod'; then
  CWD=$(pwd)
  REPO_ROOT="/Users/harshitchoudhary/Documents/projects/zuzucodes"

  # If the command explicitly cd's into web/ or app/ first, it's fine
  if echo "$CMD" | grep -qE 'cd (web|app)\b'; then
    exit 0
  fi

  # If we're already inside web/ or app/, it's fine
  if echo "$CWD" | grep -qE "$REPO_ROOT/(web|app)"; then
    exit 0
  fi

  echo "ERROR: 'vercel --prod' blocked — wrong directory." >&2
  echo "" >&2
  echo "  This repo has two separate Vercel projects:" >&2
  echo "    web/  → zuzu.codes  (landing page)" >&2
  echo "    app/  → app.zuzu.codes  (platform)" >&2
  echo "" >&2
  echo "  Use the scoped deploy commands instead:" >&2
  echo "    npm run deploy:web   # deploy landing page" >&2
  echo "    npm run deploy:app   # deploy platform" >&2
  exit 2
fi

exit 0
