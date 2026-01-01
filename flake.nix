{
  description = "Attendance Platform Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      rust-overlay,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };
        toolchain = pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;

        applications = with pkgs; [
          toolchain

          dprint
          dprint-plugins.g-plane-markup_fmt
          dprint-plugins.g-plane-malva
          dprint-plugins.g-plane-pretty_yaml
          dprint-plugins.dprint-plugin-typescript
          dprint-plugins.dprint-plugin-json
          dprint-plugins.dprint-plugin-markdown
          dprint-plugins.dprint-plugin-toml
          dprint-plugins.dprint-plugin-dockerfile

          bacon
          bun
          nodejs
          nil
          sqlx-cli
          nixd

          wasm-pack
        ];

        libraries = with pkgs; [
          openssl
          pkg-config
          gcc
          postgresql
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = applications ++ libraries;

          OPENSSL_DIR = pkgs.openssl.dev;
          OPENSSL_LIB_DIR = "${pkgs.openssl.out}/lib";
          LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath libraries;
          PKG_CONFIG_PATH = pkgs.lib.makeSearchPath "lib/pkgconfig" libraries;

          PGDATA = ".postgres";
          PGHOST = "localhost";
          PGPORT = "5432";
          PGUSER = "team2791";
          PGDATABASE = "attendance";

          shellHook = ''
            if [ ! -d "$PGDATA" ]; then
              echo "postgres: Initializing database cluster at $PGDATA"
              initdb --locale=en_US.UTF-8
            fi

            mkdir -p "$PGDATA/run"

            if ! pg_isready -q -h $PGHOST -p $PGPORT; then
              echo "postgres: Starting PostgreSQL server..."
              pg_ctl -D "$PWD/$PGDATA" -o "-p $PGPORT -k $PWD/$PGDATA/run" -w start
            fi

            echo "postgres: Creating user '$PGUSER' if it does not exist..."
            psql -U $USER -v ON_ERROR_STOP=1 postgres <<-EOSQL > /dev/null
              DO \$\$
              BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$PGUSER') THEN
                  CREATE USER $PGUSER WITH PASSWORD '$PGUSER' SUPERUSER;
                END IF;
              END \$\$;
            EOSQL

            echo "postgres: Creating database '$PGDATABASE' if it does not exist..."
            psql -U $USER -v ON_ERROR_STOP=1 postgres <<-EOSQL > /dev/null
              SELECT 'CREATE DATABASE $PGDATABASE OWNER $PGUSER;'
              WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$PGDATABASE');
              \gexec
            EOSQL
          '';
        };
      }
    );
}
