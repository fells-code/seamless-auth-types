---
'@seamless-auth/types': minor
---

Adds the `oidcApplication` module for managing the OpenID Provider's applications (clients) and the APIs (resources) they may request tokens for, on the API's `/admin/applications` and `/admin/resources` routes (ADR 0001, D5, D6, D10 and D12).

- Application create, update, keys, secret and response schemas. Public clients authenticate with PKCE alone and can hold no keys, secret or `client_credentials` grant. Confidential clients default to `private_key_jwt`. The device grant is a `deviceFlowEnabled` toggle that only first-party clients may set. Implicit, hybrid, password and `client_secret_jwt` cannot be expressed. `checkOidcApplication` holds the cross-field rules so the API can re-run them on the merged result of an update.
- Redirect URIs follow RFC 8252: exact `https` URIs, `http` on `127.0.0.1` or `[::1]` with any port at request time, and private-use schemes in reverse domain form. `localhost`, fragments and embedded credentials are refused. `oidcRedirectUriProblem` and `oidcRedirectUriKind` expose the rule.
- Resource schemas (RFC 8707 identifier, declared scopes, access token lifetime) and each application's allowed resources and scopes. The OpenID Connect scopes and `seamless` are reserved.
- `OidcApplicationRoutes` lists the admin paths.
- `admin_oidc_*` auth event types for every application and resource change.

`SystemConfigSchema` and `SystemConfigPatchSchema` gain `hosted_ui` (default `null`): branding for the provider's hosted pages, with an app name override, an `https` logo URL, hex colors and a font stack, each constrained so it cannot break out of a CSS declaration. The inferred `SystemConfig` type gains a required field, so code that builds a full config object by hand needs it.
