FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p /app/logs /app/uploads/student /app/uploads/model

EXPOSE 5000

CMD ["node", "server.js"]
