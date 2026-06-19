FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Set default port to 7860
ENV PORT=7860
EXPOSE 7860

CMD ["node", "server.js"]
