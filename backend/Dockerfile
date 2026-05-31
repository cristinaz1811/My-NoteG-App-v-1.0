FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better caching)
COPY package.json ./
RUN npm install --omit=dev

# Copy application code
COPY . .

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:5001/api/health || exit 1

CMD ["node", "server.js"]
