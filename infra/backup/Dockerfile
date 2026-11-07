FROM alpine:3.22
RUN apk add --no-cache postgresql17-client rclone tzdata
COPY backup.sh restore.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh
CMD ["backup.sh", "--schedule"]
