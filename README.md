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
