# Node 20 LTS
FROM node:20-alpine

# Create app dir
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm install

# Bundle app
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
