FROM rustlang/rust:nightly

WORKDIR /var/www/attendance
COPY ./src-api/target/release/attendance-api .
COPY start.sh .
COPY ./.output/public ./static
RUN chmod +x start.sh

CMD ["./start.sh"]
