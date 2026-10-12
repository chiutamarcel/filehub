FROM minio/minio:latest

EXPOSE 9000

EXPOSE 9001

WORKDIR /app

COPY . ./

RUN chmod +x run.sh
RUN chmod +x wait-for-it.sh

ENTRYPOINT ./run.sh