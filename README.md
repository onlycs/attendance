# Attendance

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

4. Run `cargo build --release` to build the API. It will be in 
`src-api/target/release/attendance-api`

5. Plop both `attendance-api` and `.env` into a linux server and run it,
or build the docker container (`docker build -t username/attendance src-api`)
and deploy it to the cloud (GCP, AWS, Azure, etc).

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
bun i

# Generate static files
bunx nuxi generate
```

This will create a `dist/` directory with everything you need. You should
be able to upload all the files in that directory to any traditional web
host, such as GitHub Pages.

#### Vercel

1. Make a fork of this repository
2. Go to [vercel.com](https://vercel.com/) and sign in
3. Setup building for your fork (this is a project made with NuxtJS)
4. Make sure you set `API_URL` in your environment (as shown above)
5. Point your domain at vercel

## Usage

### Attendance

To start attendance, login as an admin, and go to the attendance tab. From 
there, you can select outreach (demo), build season, or learning hours.

### Editor

To use the editor, login as admin, and go to the editor tab. From there you can:

* Give students hours
* Remove hours from students
* Change sign in and sign out times

These changes will be reflected in the database immediately.

### Students

To view your hours, login as a student using your ID, and select the "view hours" option.

## Behaviors

The student ID is, by default, five numeric digits. Change this in:

* `app/components/forms/StudentId.vue:25`
* `app/pages/editor.vue:452` (Depending on the length of your IDs)

The admin password is, by default, eight alphanumeric characters. Change this in:

* `app/components/forms/Password.vue:5`
* `app/components/forms/Password.vue:58`

The UI changes between allowing build season and learning hours depending on the month
(build season starts in January and ends in September). The API doesn't allow
the incorrect hour type, depending on the month. Change this in:

* `src-api/src/http/roster.rs:57-65`
* `app/pages/attendance/index.vue:10`