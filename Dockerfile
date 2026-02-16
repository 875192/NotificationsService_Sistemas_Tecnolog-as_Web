FROM node:24-slim

WORKDIR /app

# Instala deps primero (cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copia el resto
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
