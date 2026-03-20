# ─── Stage 1: Build ───
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY go.mod go.sum ./
RUN go mod download

# Copier le code source
COPY . .

# Compiler le binaire (statique, sans CGO)
RUN CGO_ENABLED=0 GOOS=linux go build -o minichat-server .

# ─── Stage 2: Production ───
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copier le binaire depuis le builder
COPY --from=builder /app/minichat-server .
COPY --from=builder /app/.env .env

# Port exposé (Render utilise la variable PORT)
EXPOSE 8080

# Lancer le serveur
CMD ["./minichat-server"]
