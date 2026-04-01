# Attendance

An FRC-focused attendance tracker.

## Features

- **QR Code Logins**: Students can scan a QR code to sign in
- **Fully encrypted**: All student information is fully encrypted, complying with NYS-ED laws (or so I'm told)
- **Admin Dashboard and Editor**: Admins can view and edit attendance records, student information, and more.
- **Hour Types**: Record build season, learning days, offseason, or outreach hours separately.
- **API**: Includes a REST API with OpenAPI documentation at `/api/docs` or `/api/openapi.yml`
- **Mobile Friendly**: Includes a seperate mobile interface for both students and admins

## Deployment

1. Deploy the docker container. Railway is by far the easiest way to do this.

    [![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/frc-attendance?referralCode=Y3VMtD&utm_medium=integration&utm_source=template&utm_campaign=generic)
    1. To set the timezone (`TZ`), use the [database timezone format](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List) (`TZ Identifier` column).
    2. Set the `JWT_SECRET` to a large (>32 character), random password. You do not need to remember this.

2. On your app's dashboard, select `onlycs/attendance`, and then `Settings` > `Networking`. If your team has a domain
   (e.g. `attendance.team2791.org`), add a `Custom Domain`. Otherwise, generate a domain.

     <img src="https://github.com/onlycs/attendance/blob/main/assets/deploy-railway-url.png?raw=true" alt="URL Settings" width="69%">

3. Visit `https://<your-domain>/onboard`, and click `Get a new setup token`. To view this, in Railway, select `onlycs/attendance`, and then `Deployments` > `View Logs`.

 <p align="center">
   <img src="https://github.com/onlycs/attendance/blob/main/assets/deploy-railway-logs.png?raw=true" alt="Logs" width="69%">
   <img src="https://github.com/onlycs/attendance/blob/main/assets/deploy-railway-token.png?raw=true" alt="Setup Token" width="69%">
 </p>

4. Use the setup token, enter the initial admin username and password, and you're all set!

## Further configuration

- **Inviting Admins**: `Settings` > `Invitation`
- **Student ID Format**: `Settings` > `User Management` > `Student ID Configuration`
- **Hour Goals or Requirements**: `Settings` > `Attendance`
- **Change Username or Password**: `Settings` > `My Account`

## Screenshots

![Attendance UI](https://github.com/onlycs/attendance/blob/main/assets/sc-attendance.png?raw=true)
![Admin Dashboard](https://github.com/onlycs/attendance/blob/main/assets/sc-dashboard.png?raw=true)
![Admin Settings UI](https://github.com/onlycs/attendance/blob/main/assets/sc-settings.png?raw=true)
![Hours Editor](https://github.com/onlycs/attendance/blob/main/assets/sc-editor-censored.png?raw=true)

<p align="center">
  <img src="https://github.com/onlycs/attendance/blob/main/assets/sc-mobile.png?raw=true" alt="Student Mobile UI" width="29%">
  <img src="https://github.com/onlycs/attendance/blob/main/assets/sc-sign-in.png?raw=true" alt="Login Page" width="69%">
</p>
