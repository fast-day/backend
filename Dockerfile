FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json yarn.lock ./

RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile

COPY . .

RUN yarn prisma generate --schema=./db/schema.prisma
RUN yarn build

FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile --production
RUN yarn prisma generate --schema=./db/schema.prisma

FROM node:24-alpine AS production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

RUN apk add --no-cache openssl

COPY --chown=node:node package.json ./
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/db ./db
COPY --from=build /app/assets/fonts ./assets/fonts

USER node
EXPOSE 8080

CMD ["sh", "-c", "yarn db:migrate:deploy && exec node dist/main.js"]
