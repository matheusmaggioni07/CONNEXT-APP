#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting WebRTC Security Setup...${NC}"

# Generate random secret for one-time use
SETUP_SECRET=$(openssl rand -hex 32)

echo -e "${BLUE}Calling setup endpoint...${NC}"
curl -X POST http://localhost:3000/api/setup/webrtc-security \
  -H "Authorization: Bearer $SETUP_SECRET" \
  -H "Content-Type: application/json"

echo -e "${GREEN}Setup complete!${NC}"
