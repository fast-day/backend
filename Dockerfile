FROM node:24-alpine AS development

WORKDIR /app

COPY package*.json ./
COPY db ./db

RUN yarn install

COPY . .

RUN yarn prisma generate --schema=./db/schema.prisma
RUN yarn build

FROM node:24-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY --from=development /app/node_modules ./node_modules
COPY --from=development /app/package*.json ./
COPY --from=development /app/dist ./dist
COPY --from=development /app/db ./db

EXPOSE 8080

CMD ["sh", "-c", "yarn db:migrate:deploy && yarn start:prod"]
