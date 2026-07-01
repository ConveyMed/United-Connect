fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios status

```sh
[bundle exec] fastlane ios status
```

Show latest TestFlight build number

### ios build

```sh
[bundle exec] fastlane ios build
```

Web build + Capacitor sync + Xcode archive + export signed IPA

### ios upload

```sh
[bundle exec] fastlane ios upload
```

Upload the latest IPA to App Store Connect / TestFlight

### ios submit

```sh
[bundle exec] fastlane ios submit
```

Submit current processed build for App Store review. Pass version: if auto-detect fails.

### ios release

```sh
[bundle exec] fastlane ios release
```

Full release: build -> upload -> wait for processing -> submit

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
