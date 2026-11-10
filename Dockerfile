FROM node:24-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./

RUN --mount=type=cache,target=/root/.yarn/berry/cache \
    yarn install --immutable

COPY . .

RUN yarn prisma generate --schema=./db/schema.prisma
RUN yarn build

FROM node:24-alpine AS deps

WORKDIR /app

RUN apk add --no-cache openssl && corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
COPY db ./db

RUN --mount=type=cache,target=/root/.yarn/berry/cache \
    yarn workspaces focus --production
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

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema=./db/schema.prisma && exec node dist/main.js"]
