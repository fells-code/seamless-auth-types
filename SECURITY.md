# Security Policy for Seamless Auth

Thank you for taking the time to help make Seamless Auth more secure.

Seamless Auth is a security-sensitive project used to protect authentication flows. As an open-source project, we take vulnerability reporting seriously.

---

## Supported Versions

`@seamless-auth/types` is pre-1.0. Only the latest published minor on
[npm](https://www.npmjs.com/package/@seamless-auth/types) receives fixes, and there are no
backports to earlier minors. Report against the latest release, and upgrade to it first if you
can.

This package contains schemas and types with no runtime behavior beyond validation, so most
security-relevant findings here are validation gaps: a schema that accepts input it should
reject, or a type that lets an unsafe value through to a consumer. Those are in scope. Findings
in the API server, SDKs, or hosted services belong in their own repositories.

---

## Reporting a Vulnerability

If you believe you’ve found a security issue, **please do NOT open a public GitHub issue**. Instead, report privately via email:

**security@seamlessauth.com**  
Subject: `Security Issue: seamless-auth-types`

When possible, include the following information in your report:

- A clear description of the issue
- Steps to reproduce (proof of concept if available)
- Affected versions or commits
- Suggested mitigation (optional)

We will acknowledge receipt within **3 business days** and work with you on a coordinated disclosure plan.

---

## What to Expect

Once a report is received:

1. We will acknowledge it within **3 business days**
2. We may ask follow-up questions for clarification or reproduction
3. We aim to fix critical vulnerabilities within **30 days**
4. Coordinated disclosure will be managed on a case-by-case basis

We will not publicly discuss security issues until a fix or mitigation is available.

---

## What to _not_ do

Please do not:

- Open a public issue describing a vulnerability
- Share sensitive details publicly
- Attempt to exploit the vulnerability in production or in ways that compromise user data

Responsible disclosure helps protect all users of this project.

---

## Best Practices

Seamless Auth uses modern identity and crypto best practices, but you should always:

- Review configuration and deployment settings carefully
- Rotate signing and session keys periodically
- Use HTTPS and secure cookie settings in production
- Isolate your instance from untrusted networks

---

Thank you for helping keep Seamless Auth secure!
