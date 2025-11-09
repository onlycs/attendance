-- Add migration script here

create table if not exists student_data (
    student_id text primary key not null,
    first text not null,
    last text not null
);
