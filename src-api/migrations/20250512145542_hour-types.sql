create type hour_type as enum ('build', 'learning', 'demo');

alter table
	records
add
	hour_type hour_type not null;