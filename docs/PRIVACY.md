# Privacy Policy

Last updated: October 2026

## Overview

Najimu is a desktop application that processes documents entirely on your local machine. Document text never leaves your computer.

This policy covers two things separately, because they behave differently:

- **The landing page** (najimu.zimablue.io), which collects usage analytics.
- **The desktop application**, which does not.

## Landing Page (this website)

This site loads two analytics products provided by Vercel:

- **Vercel Analytics** measures aggregate page usage: pages visited, time on page, country/region, device type, and browser.
- **Vercel Speed Insights** measures Core Web Vitals (page load performance) for each visit.

What that means in practice:

- **We do collect data** about visits to this website, including approximate location, device, and browser.
- **Vercel is the processor** for that data. Its handling is governed by the [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy) and the [Vercel DPA](https://vercel.com/legal/dpa).
- **We do not use it** for advertising, and we do not sell it or share it with advertisers.
- **We set no advertising cookies** and run no ad tech or cross-site trackers.
- **Vercel Analytics is cookieless**, and this site sets no cookies of its own.

## Desktop Application

The Najimu desktop application does **not** collect any data, and has no telemetry. All document processing happens locally on your machine.

When you first use the translation memory, the app downloads EmbeddingGemma 2 model weights from the Hugging Face hub and caches them under the app's user data directory. Model weights are a download from a third party; **document text is never included in that request**. After the weights are cached, the app no longer contacts the network for them.

## Third-Party Services

### Local AI Processing

When you use Najimu, text from your documents is sent to a local AI server (Ollama, LM Studio, or llama.cpp) that **you** install, configure, and control. We have no access to that data and no visibility into it.

### GitHub

We use GitHub for hosting source code, release downloads, and issue tracking. GitHub's handling of your data is governed by the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement).

## Cookies

We do not set any cookies on this website.

## Data Retention

Analytics data collected by Vercel is retained by Vercel for a limited period and then deleted, as described in the [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy). We hold no analytics data of our own.

## Your Rights

Depending on where you live, you may have the right to access, correct, or delete the personal data a website collects about you, and to object to or restrict certain processing.

Because the analytics above is handled by Vercel, the fastest route for a data subject request is Vercel's, which they are required to support:

- Use the request process in the [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy), or
- Email <privacy@vercel.com>

If you would rather raise it with us, open an issue at:
https://github.com/zimablue-io/najimu

## Children

This site is not directed at children, and we do not knowingly collect personal information from them.

## Changes

If this policy changes, the "Last updated" date at the top changes with it. Material changes are noted in the repository commit history.
