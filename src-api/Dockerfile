FROM rustlang/rust:nightly


# build rust project
WORKDIR /usr/src/api
COPY ./target/release/attendance-api .

# run rust project
CMD ["./attendance-api"]