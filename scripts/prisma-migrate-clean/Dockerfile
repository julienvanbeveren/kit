FROM node:18

WORKDIR /app

RUN apt-get update && apt-get install -y postgresql postgresql-contrib

USER postgres

RUN /etc/init.d/postgresql start && \
    psql --command "CREATE USER prisma WITH SUPERUSER PASSWORD 'prisma';" && \
    createdb -O prisma prisma_db

USER root

COPY . .
RUN npm install -g prisma

CMD service postgresql start && \
    prisma migrate deploy && \
    prisma migrate dev --name ${MIGRATION_NAME} --skip-generate