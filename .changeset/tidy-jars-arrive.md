---
'@seamless-auth/types': minor
---

Add `magic_link_redirect_uris` to the system config.

An exact-match allowlist of destinations a magic link may be sent to, empty by
default. `seamless-auth-api` validates a requested destination against `origins`
today, which covers a target whose host is already a WebAuthn origin and cannot
express the two cases that need this: a custom application scheme such as
`myapp://auth`, and a universal link on a host that should not also be a WebAuthn
origin.

Exact match rather than origin comparison, because neither of those has an origin
worth comparing. Empty by default, so a deployment that sets nothing keeps comparing
against `origins` exactly as it does now.

Also exports `RedirectTargetSchema`, which is what entries are validated with, and
which is stricter than `z.url()` on purpose. `z.url()` accepts anything the URL parser
does, including `javascript:alert(1)` and `data:text/html,...`. A magic link
destination is rendered as an href in an email, so one of those stored in config would
be a script-execution sink reachable through the admin system-config API. The
`javascript:`, `data:`, `vbscript:`, `file:`, `blob:` and `about:` schemes are refused,
and everything else including arbitrary application schemes is allowed, since an
allowlist of known-good schemes could not express the case this exists for.

`SystemConfigPatchSchema` takes the field too, so the guard applies to the admin write
path and not only to what a server seeds at boot.
