# Attendance System Usage Directions for Admins

## Table of Contents

- The website has three main functionalities. You can
  - [Run attendance](#running-attendance)
  - [Download hours for all students](#downloading-hours)
  - Students can check their hours (no documentation provided)

## Running attendance

- Each computer must be signed in as an admin. The ENTIRE system (apart from
  student hour checking) is password-protected[^1]. This means that, devices which are
  not signed in will not be able to log hours (for security purposes).
- Go to `Admin Panel -> Start Attendance`. This will run the attendance taking software
- You are logged out if
  - You close and re-open the page
  - You run out of time (5 hours)
- You are not logged out if
  - You exit the admin panel
  - You reload the page

## Downloading Hours

- Due to restrictions, I cannot store student-identifying information on the database[^2].
- Therefore, you must upload info about students to download their info.

1. Ask Angad for the student data
2. Login to the admin panel, and
3. Download student hours
4. Upload the student data that Angad may or may not have given you
5. Download the file it asks you, which contains all of the hours data

[^1]: Not really. When you sign in with a password, a "token" is generated that allows you
  to access the site (as admin) and expires after 5 hours. After that, you must sign in again to regenerate the token. This keeps the website more secure.

[^2]: So how do I store their info in the first place you may ask? Good question! Here's the rundown:

  There exists a mathematical function called a hash. It takes some input data and turns it
  into some unrecognisable output data. However, it always gives the same output data (for
  some given input), consistently. It is also unique enough that it can never feasably have
  a collision (that is, two inputs having the same output). A basic hash function would
  be assigning a=1, b=2, and so on, then adding them all up for your input text. It turns
  normal text into something that cannot be turned back into the normal text, but given the
  same input text, it will always give back the same output number. In reality the hash
  function I use is [much more complicated](https://wikipedia.org/wiki/sha256), and is
  used to secure literally every password on almost every service (thing Google, Apple,
  Microsoft, etc.).
