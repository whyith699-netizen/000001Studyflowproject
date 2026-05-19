FROM node:20-slim

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install --production

# Copy rest of the application
COPY . .

# Ensure the app can find the service account if mounted or copied
ENV FIREBASE_SERVICE_ACCOUNT_PATH=/app/service-account.json

EXPOSE 3000

CMD ["npm", "start"]
