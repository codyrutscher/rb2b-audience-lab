#!/bin/bash
# Deploy only the worker essentials to a DigitalOcean droplet (no GitHub push needed)
# Usage: ./scripts/deploy-worker-to-droplet.sh [droplet_ip]
# Or:    DROPLET_IP=64.23.247.197 ./scripts/deploy-worker-to-droplet.sh

set -e
cd "$(dirname "$0")/.."
DROPLET_IP="${1:-$DROPLET_IP}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_rb2b_worker}"
REMOTE_DIR="/var/www/reactivate-worker"

if [ -z "$DROPLET_IP" ]; then
  echo "Usage: $0 <droplet_ip>"
  echo "   or: DROPLET_IP=64.23.247.197 $0"
  exit 1
fi

echo "Deploying worker essentials to root@$DROPLET_IP:$REMOTE_DIR"
echo ""

# Create remote dir
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new root@$DROPLET_IP "mkdir -p $REMOTE_DIR"

# Sync only what the worker needs (no app/, .next, node_modules)
rsync -avz \
  -e "ssh -i $SSH_KEY" \
  package.json \
  package-lock.json \
  prisma/ \
  lib/reactivate/ \
  scripts/reactivate-worker.ts \
  ecosystem.config.js \
  root@$DROPLET_IP:$REMOTE_DIR/

echo ""
echo "Done. On the droplet run:"
echo "  cd $REMOTE_DIR"
echo "  npm install"
echo "  npx prisma generate"
echo "  nano .env   # add DATABASE_URL, RESEND_*, HUGGINGFACE_TOKEN, etc."
echo "  pm2 start ecosystem.config.js"
echo "  pm2 save && pm2 startup"
