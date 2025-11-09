# Attendance

## How it works

The project is written using [NuxtJS](https://nuxt.com/) for the frontend and [Rust](https://www.rust-lang.org/) with [Actix-web](https://actix.rs/) for the backend API. Communication is done using standard REST, as well as websockets for real-time updates in the admin editor. The project is designed with student data security in mind—all sensitive info is end-to-end encrypted.

### Admin Flows

- Login as admin using your password
  - Authentication is done using [`srp6a`](https://en.wikipedia.org/wiki/Secure_Remote_Password_protocol), a zero-knowledge password proof protocol
  - The admin password also serves as a decryption key [`AES-GCM`](https://en.wikipedia.org/wiki/Galois/Counter_Mode) to protect sensitive data in the database

- Start attendance for either learning, build, offseason, or demo hours
  - First-time sign ins require students to enter their first and last name, which are encrypted before being stored in the database
  - Subsequent sign ins only require student IDs
  - Records, as well as student data, are keyed by a [hash](https://en.wikipedia.org/wiki/sha256) of the student ID

- The editor (server)
  - On the server, [websockets](https://en.wikipedia.org/wiki/websocket) are used to push real-time updates to all connected clients
  - PostgreSQL listens for changes using the [`LISTEN/NOTIFY`](https://www.postgresql.org/docs/current/sql-notify.html) feature
  - Admins can add or remove hours, or change sign in and sign out times for students

- The editor (client)
  - On the client side, the editor uses [`ag-grid`](https://ag-grid.com/) for the data table UI
  - I moved from a [completely custom](https://github.com/onlycs/attendance/blob/e005c40290db5f56cd372ac3c558d927866f1fc0/app/utils/canvas.ts) [canvas-based](https://github.com/onlycs/attendance/blob/e005c40290db5f56cd372ac3c558d927866f1fc0/app/pages/editor.vue#L415C1-L915C3) implementation for maintainability reasons
    - I just want to note that the canvas implementation was really cool and super performant when the DOM failed me.

### Student Flows

- Login as student using your ID
  - View your hours, collected by the server using the hashed student ID as a key

## Building and Deployment

### Backend

1. Setup a PostgreSQL database with your favorite provider (I use
   [Supabase](https://supabase.com/)).

2. Make an admin password by generating a `bcrypt` hash (online at
   [bcrypt-generator.com](https://bcrypt-generator.com/))

3. Go into `src-api/` and create a `.env` file with the following:

```dotenv
DATABASE_URL = 'the_url_of_your_database' # will start with postgres://
ADMIN_CRYPT = 'your_bcrypt_hash' # make sure to use singlequotes!!
```

4. Run `cargo build --release` to build the API. It will be in `src-api/target/release/attendance-api`

5. Plop both `attendance-api` and `.env` into a linux server and run it, or build the docker container (`docker build -t username/attendance src-api`) and deploy it to the cloud (GCP, AWS, Azure, etc).

### Frontend

#### Static

To generate static files:

1. Create a `.env` file in the repository directory with the following:

```dotenv
API_URL = "https://my.public.api.example.com" # replace with your actual backend URL
```

2. Run

```sh
# Install dependencies first
$ bun i

# Generate static files
$ bunx nuxi generate
```

This will create a `dist/` directory with everything you need. You should be able to upload all the files in that directory to any traditional web host, such as GitHub Pages.

#### Vercel

1. Make a fork of this repository
2. Go to [vercel.com](https://vercel.com/) and sign in
3. Setup building for your fork (this is a project made with NuxtJS)
4. Make sure you set `API_URL` in your environment (as shown above)
5. Point your domain at vercel

## Usage

### Attendance

To start attendance, login as an admin, and go to the attendance tab. From there, you can select outreach (demo), build season, or learning hours.

### Editor

To use the editor, login as admin, and go to the editor tab. From there you can:

- Give students hours
- Remove hours from students
- Change sign in and sign out times

These changes will be reflected in the database immediately.

### Students

To view your hours, login as a student using your ID, and select the "view hours" option.

## Behaviors

The student ID is, by default, five numeric digits. Change this in:

- `app/components/forms/StudentId.vue:25`

The admin password is, by default, eight alphanumeric characters. Change this in:

- `app/components/forms/Password.vue:5`
- `app/components/forms/Password.vue:58`

The UI changes between allowing build, learning, and offseason hours depending on the month. The API doesn't allow incorrect hour types. Change this in:

- `src-api/src/http/roster.rs:57-65`
- `app/pages/attendance/index.vue:10`
