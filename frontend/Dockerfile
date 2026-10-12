FROM node:21 AS dev

WORKDIR /app

COPY package*.json ./

# RUN npm install js-cookie --save

RUN npm install

COPY . .

RUN npx tailwindcss init -p


EXPOSE 6969

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
