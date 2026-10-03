# Release Process

This document explains how releases work for Document Localizer.

## Overview

We use **release-please** to automate version bumps and changelog generation based on conventional commits. The release process involves two GitHub Actions workflows:

1. **Release Please** (`.github/workflows/release-please.yml`) - Creates release PRs and publishes releases
2. **Build Release** (`.github/workflows/build-on-release.yml`) - Builds and uploads platform binaries

## Why Release-Please Creates PRs

Release-please is designed to create a **pull request** for each release rather than committing directly to `main`. This is intentional for security:

- CI/CD cannot make unreviewed changes to `main`
- All releases require code review before being merged
- The PR serves as a final checkpoint to verify the release contents

## The Release Flow

```
1. Developer pushes to main (conventional commit message)
2. Release Please workflow triggers on push to main
3. Release Please creates a PR titled "chore(main): release X.Y.Z"
4. PR is reviewed and merged to main
5. Release Please publishes the release (creates tag + GitHub release)
6. Release Please triggers Build Release via workflow_dispatch
7. Build Release builds for macOS, Windows, and Linux
8. Build Release uploads binaries to the release
```

## Important: GITHUB_TOKEN Limitation

GitHub Actions has a security restriction where a workflow triggered by `GITHUB_TOKEN` cannot trigger other workflows. Since release-please publishes releases using `GITHUB_TOKEN`, it uses `workflow_dispatch` to trigger the build workflow instead of relying on the `release` event.

This means:
- The `Build Release` workflow triggers via `workflow_dispatch` from release-please
- Both workflows must have `workflow_dispatch` enabled (which they do)
- If a build fails, you can manually re-trigger it from the Actions tab

## Manual Build Trigger

If a build fails or you need to rebuild:

1. Go to the **Actions** tab on GitHub
2. Select **Build Release** workflow
3. Click **Run workflow**
4. Select the desktop release tag (e.g., `desktop-v0.4.3`). A branch ref is refused.

## Version Bumping

The version is determined automatically by release-please based on commit messages:

| Commit Type | Example | Version Change |
|-------------|---------|---------------|
| `fix:` | `fix: resolve bug` | Patch bump |
| `feat:` | `feat: new feature` | Minor bump |
| `feat!:` or `fix!:` | `feat!: breaking change` | Major bump |

See [conventionalcommits.org](https://www.conventionalcommits.org/) for full specification.

## Release Artifacts

After a successful build, the release includes:

- **macOS Apple silicon**: `Document-Localizer-mac-arm64.dmg`
- **macOS Intel**: `Document-Localizer-mac-x64.dmg`
- **Windows**: `Document-Localizer-win-x64.exe`
- **Linux**: `Document-Localizer-linux-x86_64.AppImage`

The file names do not include the version, so `releases/latest/download/<file>` keeps working after each release. Builds are unsigned. `CSC_IDENTITY_AUTO_DISCOVERY` is false, and the macOS config sets `identity` to null. `electron-builder` is invoked with `--publish never`; the workflow uploads the artifacts, including the updater metadata.

## Troubleshooting

### Release PR not created
- Check that commit messages follow conventional commits format
- Verify release-please workflow ran successfully in Actions

### Build not triggered
- Check if release was published (release-please may have failed)
- Manually trigger Build Release via workflow_dispatch

### Build failed
- Check the workflow logs for errors
- Common issues: missing dependencies, build script errors
