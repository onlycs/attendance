{ pkgs ? import <nixpkgs> { } }:

let
  fenix = import
    (fetchTarball "https://github.com/nix-community/fenix/archive/main.tar.gz")
    { };
  toolchain = fenix.latest.withComponents [
    "cargo"
    "clippy"
    "rust-src"
    "rustc"
    "rustfmt"
    "rust-analyzer"
  ];
in pkgs.mkShell {
  buildInputs = with pkgs; [
    toolchain
    openssl
    pkg-config
    gcc
    sqlx-cli
    postgresql

    bun
    nodejs
    biome

    nil
    nixd
  ];

  shellHook = ''
    export OPENSSL_DIR="${pkgs.openssl.dev}"
    export OPENSSL_LIB_DIR="${pkgs.openssl.out}/lib"
    export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig:$PKG_CONFIG_PATH"
    export LD_LIBRARY_PATH="${pkgs.openssl.out}/lib"
  '';
}
