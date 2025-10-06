#!/usr/bin/bash

if [ ! -d "$PGDATA" ]; then
      echo "Initializing PostgreSQL database in $PGDATA..."
      initdb --locale=C --encoding=UTF8 --auth=trust -U "$PGUSER"
    fi

if ! pg_ctl status > /dev/null 2>&1; then
        echo "Starting PostgreSQL..."
        pg_ctl -l "$PGDATA/logfile" -o "-k $PGDATA" -w start
        
        # Create database if it doesn't exist
        if ! psql -lqt | cut -d \| -f 1 | grep -qw "$PGDATABASE"; then
          echo "Creating database: $PGDATABASE"
          createdb "$PGDATABASE"
        fi
        
        echo "PostgreSQL is ready!"
        echo "Connect with: psql $PGDATABASE"
      else
        echo "PostgreSQL is already running"
      fi



