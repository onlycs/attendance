FROM rustlang/rust:nightly

# Timezone
RUN apt update && DEBIAN_FRONTEND=noninteractive apt -y install tzdata
RUN rm /etc/localtime && ln -s /usr/share/zoneinfo/America/New_York /etc/localtime
ENV TZ="America/New_York"

# build rust project
WORKDIR /usr/src/api
COPY ./target/release/attendance-api .

# run rust project
CMD ["./attendance-api"]
