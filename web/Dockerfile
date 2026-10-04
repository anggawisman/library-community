# ---------- Dependencies ----------
    FROM node:20-alpine AS deps

    WORKDIR /app
    
    COPY package.json package-lock.json ./
    RUN npm ci
    
    
    # ---------- Build ----------
    FROM node:20-alpine AS builder
    
    WORKDIR /app
    
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    
    RUN npm run build
    
    
    # ---------- Production ----------
    FROM node:20-alpine AS runner
    
    WORKDIR /app
    
    ENV NODE_ENV=production
    ENV HOSTNAME=0.0.0.0
    ENV PORT=3000
    
    # Standalone output contains the minimal runtime dependencies
    # and automatically generated server.js
    COPY --from=builder /app/.next/standalone ./
    
    # Static assets are NOT included in standalone automatically
    COPY --from=builder /app/.next/static ./.next/static
    
    # Public assets
    # COPY --from=builder /app/public ./public
    
    EXPOSE 3000
    
    USER node
    
    CMD ["node", "server.js"]