FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Set default port to 5000
ENV PORT=5000
EXPOSE 5000

CMD ["node", "server.js"]
