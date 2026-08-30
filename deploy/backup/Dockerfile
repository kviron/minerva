FROM restic/restic:0.18.0 AS restic

FROM postgres:17.5-alpine
RUN apk add --no-cache aws-cli jq
COPY --from=restic /usr/bin/restic /usr/local/bin/restic
COPY deploy/backup/*.sh /opt/minerva/
RUN chmod 0555 /opt/minerva/*.sh
USER postgres
ENTRYPOINT []
