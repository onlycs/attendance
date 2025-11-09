{
  description = "Attendance Platform Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    fenix.url = "github:nix-community/fenix";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      fenix,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        toolchain = fenix.packages.${system}.latest.withComponents [
          "cargo"
          "clippy"
          "rust-src"
          "rustc"
          "rustfmt"
          "rust-analyzer"
        ];

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

          PGDATA = "$PWD/.postgres";
          PGHOST = "$PGDATA";
          PGDATABASE = "attendance";
          PGUSER = "$USER";

          shellHook = ''
            nohup bash "$PWD/.scripts/postgres.sh" &
            disown
          '';
        };
      }
    );
}
