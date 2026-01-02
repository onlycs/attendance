use dotenvy_macro::dotenv;
use itertools::Itertools;
use proc_macro2::Span;
use quote::quote;
use sqlx::postgres::PgPoolOptions;
use syn::{parse::Parse, punctuated::Punctuated};

async fn declare_permissions_impl() -> proc_macro2::TokenStream {
    let pg = PgPoolOptions::new()
        .connect(dotenv!("DATABASE_URL"))
        .await
        .expect("Failed to connect to database");

    let schema = sqlx::query!(
        r#"
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'permissions'
            AND column_name NOT IN ('user_id')
        "#
    )
    .fetch_all(&pg)
    .await
    .expect("Failed to fetch permissions schema");

    let permissions = schema
        .into_iter()
        .filter_map(|row| row.column_name)
        .map(|col| syn::Ident::new(&col, Span::call_site()))
        .collect_vec();

    let permissions_camel = permissions
        .iter()
        .map(|perm| heck::AsPascalCase(perm.to_string().as_str()).to_string())
        .map(|col| syn::Ident::new(&col, Span::call_site()))
        .collect_vec();

    let insert_str = format!(
        r#"
        INSERT INTO PERMISSIONS (user_id, {})
        VALUES ($1, {})
        "#,
        permissions.iter().map(|id| id.to_string()).join(","),
        (0..permissions.len())
            .map(|i| format!("${}", i + 2))
            .join(",")
    );

    let update_str = format!(
        r#"
        UPDATE PERMISSIONS
        SET {}
        WHERE user_id = $1
        RETURNING *
        "#,
        permissions
            .iter()
            .enumerate()
            .map(|(i, p)| format!("{p} = COALESCE(${}, {p})", i + 2))
            .join(", ")
    );

    let struct_def = quote! {
        #[derive(
            Clone,
            Copy,
            Debug,
            Default,
            ::poem_openapi::Object,
            ::serde::Serialize,
            ::serde::Deserialize,
        )]
        pub struct Permissions {
            #(pub(crate) #permissions: bool),*
        }

        impl Permissions {
            pub fn all() -> Self {
                Self {
                    #( #permissions: true ),*
                }
            }

            pub fn none() -> Self {
                Self {
                    #( #permissions: false ),*
                }
            }

            pub async fn create(&self, user_id: &str, pg: &::sqlx::PgPool) -> Result<(), sqlx::Error> {
                sqlx::query!(
                    #insert_str,
                    user_id,
                    #( self.#permissions ),*
                )
                .execute(pg)
                .await?;

                Ok(())
            }
        }

        #[derive(
            Clone,
            Debug,
            ::poem_openapi::Object,
            ::serde::Serialize,
            ::serde::Deserialize,
            ::sqlx::FromRow,
            ::sqlx::Decode
        )]
        pub struct DbPermissions {
            pub(crate) user_id: String,
            #(pub(crate) #permissions: bool),*
        }

        impl From<DbPermissions> for Permissions {
            fn from(db_perms: DbPermissions) -> Self {
                Self {
                    #( #permissions: db_perms.#permissions ),*
                }
            }
        }

        impl From<Option<DbPermissions>> for DbPermissions {
            fn from(opt: Option<DbPermissions>) -> Self {
                opt.unwrap_or(DbPermissions {
                    user_id: String::new(),
                    #( #permissions: false ),*
                })
            }
        }

        #[derive(
            Clone,
            Copy,
            Debug,
            Default,
            ::poem_openapi::Object,
            ::serde::Serialize,
            ::serde::Deserialize,
        )]
        pub struct PartialPermissions {
            #(pub(crate) #permissions: Option<bool>),*
        }

        impl PartialPermissions {
            pub async fn update(&self, user_id: &str, pg: &::sqlx::PgPool) -> Result<Permissions, sqlx::Error> {
                let rec = sqlx::query!(
                    #update_str,
                    user_id,
                    #( self.#permissions ),*
                )
                .fetch_one(pg)
                .await?;

                Ok(Permissions {
                    #( #permissions: rec.#permissions ),*
                })
            }
        }
    };

    let enum_def = quote! {
        #[derive(
            Clone,
            Copy,
            Debug,
            PartialEq,
            Eq,
            ::poem_openapi::Enum,
            ::strum::EnumIter,
            ::strum::EnumString,
            ::strum::Display,
        )]
        #[repr(u16)]
        #[strum(serialize_all = "snake_case")]
        #[oai(rename_all = "snake_case")]
        pub(crate) enum Permission {
            #( #permissions_camel ),*
        }

        impl From<Option<Permissions>> for Permissions {
            fn from(opt: Option<Permissions>) -> Self {
                opt.unwrap_or_default()
            }
        }
    };

    let index_def = quote! {
        impl ::std::ops::Index<Permission> for Permissions {
            type Output = bool;

            fn index(&self, index: Permission) -> &Self::Output {
                match index {
                    #( Permission::#permissions_camel => &self.#permissions ),*
                }
            }
        }
    };

    quote! {
        #struct_def
        #enum_def
        #index_def
    }
}

async fn declare_replication_impl(table: String) -> proc_macro2::TokenStream {
    let pg = PgPoolOptions::new()
        .connect(dotenv!("DATABASE_URL"))
        .await
        .expect("Failed to connect to database");

    let schema = sqlx::query!(
        r#"
        SELECT
            c.column_name,
            c.data_type,
            c.is_nullable,
            CASE WHEN kcu.column_name IS NOT NULL THEN true ELSE false END AS is_pkey
        FROM
            information_schema.columns c
            LEFT JOIN information_schema.table_constraints tc
                ON tc.table_name = c.table_name
                AND tc.table_schema = c.table_schema
                AND tc.constraint_type = 'PRIMARY KEY'
            LEFT JOIN information_schema.key_column_usage kcu
                ON kcu.constraint_name = tc.constraint_name
                AND kcu.table_name = c.table_name
                AND kcu.column_name = c.column_name
        WHERE
            c.table_name = $1;
        "#,
        table
    )
    .fetch_all(&pg)
    .await
    .expect("Failed to fetch table schema");

    let mut pkey = None;
    let mut idents = vec![];
    let mut tys = vec![];

    for col in &schema {
        let name = match &col.column_name {
            Some(n) => n,
            None => continue,
        };

        let mut rust_ty = match col.data_type.as_deref() {
            Some("text") => "String",
            Some("timestamp with time zone") => "::chrono::DateTime<::chrono::Utc>",
            Some("boolean") => "bool",
            Some("USER-DEFINED") => "HourType",
            _ => panic!("Unsupported data type"),
        }
        .to_string();

        if let Some("YES") = col.is_nullable.as_deref() {
            rust_ty = format!("Option<{}>", rust_ty);
        }

        let ident = syn::Ident::new(name, Span::call_site());
        let ty = syn::parse_str::<syn::Type>(&rust_ty).unwrap();

        if col.is_pkey.unwrap_or(false) {
            pkey = Some((ident.clone(), ty.clone()));
        }

        idents.push(ident);
        tys.push(ty);
    }

    let table_single = table.trim_end_matches("es").trim_end_matches('s');

    let (pkey, pkey_ty) = pkey.expect("Table must have a primary key");
    let struct_ident = syn::Ident::new(
        &format!("{}", heck::AsPascalCase(table_single)),
        Span::call_site(),
    );
    let partial_ident = syn::Ident::new(
        &format!("Partial{}", heck::AsPascalCase(table_single)),
        Span::call_site(),
    );
    let replication_ident = syn::Ident::new(
        &format!("Replicate{}", heck::AsPascalCase(table_single)),
        Span::call_site(),
    );

    let (partial_idents, partial_tys) = idents
        .iter()
        .zip(&tys)
        .filter(|(id, _)| id.to_string() != pkey.to_string())
        .unzip::<_, _, Vec<_>, Vec<_>>();

    quote! {
        #[derive(
            Clone,
            Debug,
            PartialEq,
            ::serde::Serialize,
            ::serde::Deserialize,
            ::sqlx::FromRow,
            ::poem_openapi::Object
        )]
        pub(crate) struct #struct_ident {
            #( pub #idents: #tys ),*
        }

        impl Identifiable<#pkey_ty> for #struct_ident {
            fn pkey(&self) -> &#pkey_ty {
                &self.#pkey
            }
        }

        impl Row for #struct_ident {
            const NAME: &'static str = #table;
            type Key = #pkey_ty;
            type Partial = #partial_ident;
        }

        #[derive(Clone, Debug, PartialEq, ::serde::Serialize, ::serde::Deserialize, ::poem_openapi::Object)]
        pub(crate) struct #partial_ident {
            pub #pkey: #pkey_ty,
            #( pub #partial_idents: Option<#partial_tys> ),*
        }

        impl Identifiable<#pkey_ty> for #partial_ident {
            fn pkey(&self) -> &#pkey_ty {
                &self.#pkey
            }
        }

        impl ApplyTo<#struct_ident> for #partial_ident {
            fn apply(self, target: &mut #struct_ident) {
                if target.#pkey != self.#pkey {
                    return;
                }

                #( if let Some(value) = self.#partial_idents {
                    target.#partial_idents = value;
                } )*
            }
        }

        pub(crate) type #replication_ident = Replication<#struct_ident>;
    }
}

async fn declare_event_modules_impl() -> proc_macro2::TokenStream {
    let pg = PgPoolOptions::new()
        .connect(dotenv!("DATABASE_URL"))
        .await
        .expect("Failed to connect to database");

    // get all variants of event_type enum as strings
    let snake_strs = sqlx::query!(
        r#"
        SELECT enumlabel
        FROM pg_enum
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
        WHERE pg_type.typname = 'event_type'
        ORDER BY enumsortorder;
        "#
    )
    .fetch_all(&pg)
    .await
    .expect("Failed to fetch event types")
    .into_iter()
    .map(|row| row.enumlabel)
    .collect_vec();

    let snake_idents = snake_strs
        .iter()
        .map(|s| syn::Ident::new(&s, Span::call_site()))
        .collect_vec();

    let camel_idents = snake_strs
        .iter()
        .map(|s| {
            let camel = heck::AsPascalCase(s).to_string();
            syn::Ident::new(&camel, Span::call_site())
        })
        .collect_vec();

    quote! {
        #( mod #snake_idents; )*
        #( pub(crate) use #snake_idents::#camel_idents; )*

        #[derive(
            Clone,
            Debug,
            ::serde::Serialize,
            ::serde::Deserialize,
            ::strum::EnumDiscriminants,
            ::poem_openapi::Union,
        )]
        #[oai(discriminator_name = "event", rename_all = "snake_case")]
        #[serde(tag = "event", content = "data", rename_all = "snake_case")]
        #[strum_discriminants(derive(::poem_openapi::Enum, ::sqlx::Type))]
        #[strum_discriminants(name(EventType))]
        #[strum_discriminants(sqlx(type_name = "event_type", rename_all = "snake_case"))]
        #[strum_discriminants(oai(rename_all = "snake_case"))]
        pub(crate) enum Event {
            #( #camel_idents(#camel_idents), )*
        }

        #(
            impl From<#camel_idents> for Event {
                fn from(it: #camel_idents) -> Event {
                    Event::#camel_idents(it)
                }
            }

            impl #camel_idents {
                pub(crate) fn sql_pair(&self) -> Result<(&'static str, serde_json::Value), serde_json::Error> {
                    let discrim = #snake_strs;
                    let v = serde_json::to_value(self)?;

                    Ok((discrim, v))
                }
            }
        )*
    }
}

#[proc_macro]
pub fn declare_permissions(_: proc_macro::TokenStream) -> proc_macro::TokenStream {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(declare_permissions_impl())
        .into()
}

#[proc_macro]
pub fn declare_replication(inner: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let table = syn::parse_macro_input!(inner as syn::LitStr).value();

    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(declare_replication_impl(table))
        .into()
}

#[proc_macro]
pub fn declare_event_modules(_: proc_macro::TokenStream) -> proc_macro::TokenStream {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(declare_event_modules_impl())
        .into()
}

#[proc_macro_attribute]
pub fn auto_operation_ids(
    _: proc_macro::TokenStream,
    tokens: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    let mut input = syn::parse_macro_input!(tokens as syn::ItemImpl);

    let oai_attr = input
        .attrs
        .iter()
        .find(|attr| attr.meta.path().is_ident("OpenApi"))
        .expect("auto_operation_ids can only be applied to impl blocks with #[OpenApi] attribute");

    let syn::Meta::List(syn::MetaList {
        tokens: oai_tokens, ..
    }) = &oai_attr.meta
    else {
        panic!("OpenApi attribute must be a list");
    };

    struct OaiMeta {
        items: Punctuated<syn::MetaNameValue, syn::Token![,]>,
    }

    impl Parse for OaiMeta {
        fn parse(input: syn::parse::ParseStream) -> syn::Result<Self> {
            let items = Punctuated::parse_terminated(input)?;
            Ok(OaiMeta { items })
        }
    }

    let oai_meta = syn::parse2::<OaiMeta>(oai_tokens.clone())
        .expect("Failed to parse OpenApi attributes")
        .items;

    let prefix_path = oai_meta
        .iter()
        .find(|meta| meta.path.is_ident("prefix_path"))
        .and_then(|meta| {
            if let syn::Expr::Lit(syn::ExprLit {
                lit: syn::Lit::Str(str),
                ..
            }) = &meta.value
            {
                Some(str.value())
            } else {
                None
            }
        })
        .unwrap_or_default();

    for item in &mut input.items {
        let syn::ImplItem::Fn(func) = item else {
            continue;
        };

        let mut attrs = func.attrs.iter_mut();

        let Some(oai_attr) = attrs.find(|attr| attr.meta.path().is_ident("oai")) else {
            continue;
        };

        let syn::Meta::List(syn::MetaList { tokens, .. }) = &mut oai_attr.meta else {
            continue;
        };

        let operation_id = func.sig.ident.to_string();
        let full_operation_id = format!(
            "{}_{}",
            prefix_path.trim_start_matches('/').split('/').join("_"),
            operation_id
        );

        // tokens is going to be key = value, key = value, ...
        // we can just add our tag here
        *tokens = quote! { #tokens, operation_id = #full_operation_id };

        // just add a doc comment with the operation id for clarity
        let oid_camel = heck::AsPascalCase(operation_id.as_str()).to_string();
        func.attrs.push(syn::parse_quote! {
            #[doc = #oid_camel]
        });
    }

    quote! { #input }.into()
}
