FROM node:24-slim

WORKDIR /app

# Instala curl (necesario para el healthcheck de Docker Compose)
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Instala deps primero (cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copia el resto
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
