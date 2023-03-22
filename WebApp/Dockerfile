#Stage 1: building using build image
FROM node:16.14.2-alpine3.14 as build_image
WORKDIR /usr/src/app
COPY . .
RUN npm install
RUN npm run build

#Stage 2: creating runtime image
FROM node:16.14.2-alpine3.14
WORKDIR /app
COPY --from=BUILD_IMAGE /usr/src/app/build ./build
COPY --from=BUILD_IMAGE /usr/src/app/client ./client
COPY --from=BUILD_IMAGE /usr/src/app/node_modules ./node_modules
COPY --from=BUILD_IMAGE /usr/src/app/package.json ./package.json
CMD npm run start -- -w -m public -p 80
EXPOSE 80