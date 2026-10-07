# Changelog

## [0.3.0](https://github.com/zimablue-io/najimu/compare/v0.2.0...v0.3.0) (2026-10-07)


### Features

* add .doc as an available export option ([64e779a](https://github.com/zimablue-io/najimu/commit/64e779a66e7137e9f35a1f25121ba3b3222d29ff))
* add connection checking in Header component to monitor API status ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* allow user to manage multiple models, UI changes around settings ([cef3d19](https://github.com/zimablue-io/najimu/commit/cef3d19519fb4c9a2e6f5b3d7dc703454765c1d3))
* **brand:** rename document-localizer to Najimu ([904dc76](https://github.com/zimablue-io/najimu/commit/904dc76ae9b859fcd4362ac92dcd4610b71532c5))
* create document-helpers for reusable components like LocaleSelect and StatusIcon ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* **desktop:** add in-process EmbeddingGemma 2 translation memory ([688c551](https://github.com/zimablue-io/najimu/commit/688c5518a0f21790ef00c8dd8a26cf30e1a3d101))
* enhance EmptyState component with Upload icon and improve file validation ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* enhance error handling and logging, and improve user feedback ([12704fe](https://github.com/zimablue-io/najimu/commit/12704feb44e69f96d152344a28b07d374420f990))
* enhance file dialog options, update model management, and improve UI interactions ([7c60438](https://github.com/zimablue-io/najimu/commit/7c60438f3b3bffa97b1ece306a7c68e46bc64528))
* expand ALL_LOCALES with additional languages and variants for comprehensive localization support ([a6b8d22](https://github.com/zimablue-io/najimu/commit/a6b8d22c0b794e2c333cacce7aa17ff5ca830681))
* implement auto-update functionality with IPC communication ([a492bbc](https://github.com/zimablue-io/najimu/commit/a492bbce89473990ada54bdb34fbcd37fdd7043a))
* implement auto-updater functionality and release workflow for desktop app ([04bddc2](https://github.com/zimablue-io/najimu/commit/04bddc22adf70d5e1be251889bcd38f4b0b01cf4))
* implement DebugBoundary in main.tsx for better error handling during app startup ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* implement locale management with ALL_LOCALES and update settings structure ([59445dd](https://github.com/zimablue-io/najimu/commit/59445ddd65004b1062554ed2f34ed81527983309))
* implement locale validations, remove pause and stop functionality ([32be038](https://github.com/zimablue-io/najimu/commit/32be03870af2b61b67e7520972304a0c69842b81))
* improved seo, fix tests ([98f0939](https://github.com/zimablue-io/najimu/commit/98f0939747aaf5919d72665b543a593100d38cc9))
* init project ([a3dd49c](https://github.com/zimablue-io/najimu/commit/a3dd49c771ebae66e9d1133ef463b81d2fc5f308))
* modify HistoryPanel to include new status types and improve UI elements ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* refactor SettingsModal for better locale management and model editing ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* test if release-please creates a new release tag ([886be10](https://github.com/zimablue-io/najimu/commit/886be10534a7107f7b23ec6f68f171a06aa9d795))
* test release trigger with dummy change ([68ff37f](https://github.com/zimablue-io/najimu/commit/68ff37f379901bacb5e59186a99496e0ac8a44ed))
* update ExportDialog to include accessibility attributes and improve dialog behavior ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* update translation prompt to improve clarity and accuracy requirements ([a416884](https://github.com/zimablue-io/najimu/commit/a4168844b173b273d3077914be7c15f44c7ca869))
* update UI components and styles, refactor API URLs, and add integration tests ([5c8441c](https://github.com/zimablue-io/najimu/commit/5c8441c5dba039ea69586f8ec0f92a28b05fdf33))


### Bug Fixes

* add electron-builder config for macOS DMG build ([7a513b3](https://github.com/zimablue-io/najimu/commit/7a513b3b6bba6dfbe72eba23333db870be6fefc5))
* add ms as explicit dependency for electron-updater ([4f19e35](https://github.com/zimablue-io/najimu/commit/4f19e35863993f68eb39aeda26d7249e744054f7))
* build script now builds core and ui dependencies first ([9d3bfd9](https://github.com/zimablue-io/najimu/commit/9d3bfd9aaaf9809a670a1ab39eb741382eb23f6f))
* **build:** repair tooling, dependencies, and stale build output ([3dc6bfe](https://github.com/zimablue-io/najimu/commit/3dc6bfe16cbc1073273210c5ae42e4730db6787b))
* **desktop:** write Word exports as OOXML .docx ([0e55311](https://github.com/zimablue-io/najimu/commit/0e5531185148ddba91045de426cc07b69be059cd))
* dev server and production build issues ([8e55435](https://github.com/zimablue-io/najimu/commit/8e55435d0e0a6938d01f3fe73a9a769588592e2a))
* Enhance localization prompt handling and validation ([273a36f](https://github.com/zimablue-io/najimu/commit/273a36fdf439e37d1b6b918a21495b1aec5714c3))
* improve error formatting in utils and ensure consistent string handling ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* include dist folder in electron-builder packaging ([e930221](https://github.com/zimablue-io/najimu/commit/e930221047e21718d0aa0504e11c556904c50853))
* move electron to devDependencies and add required fields ([a2df523](https://github.com/zimablue-io/najimu/commit/a2df523310b9f69eb1828ab07575be690a669399))
* prevent page from breaking after user rejects generation changes ([b7bc3f3](https://github.com/zimablue-io/najimu/commit/b7bc3f3ce419fa56edf1879c792dcf1fc5b53ced))
* production build works with base: './' and fix nested button ([08a624b](https://github.com/zimablue-io/najimu/commit/08a624b7f90426a392034bfc6fe7b6996148aebf))
* remove unnecessary useCallback dependencies ([9915183](https://github.com/zimablue-io/najimu/commit/9915183cc893132947ce3e895f1c6e83bc087268))
* resolve lint errors and enable pre-commit hook ([d74cc6d](https://github.com/zimablue-io/najimu/commit/d74cc6dbc1d29df879e280b1d4d46b4981b9f1ff))
* streamline change detection logic for improved readability and performance ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* update localization quality tests for better string handling and consistency ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* update publish owner to zimablue-io org ([ecb8c44](https://github.com/zimablue-io/najimu/commit/ecb8c4425d7d3c5f77b83d7c62e5c7f7d5e3f33a))

## [0.2.0](https://github.com/zimablue-io/najimu/compare/v0.1.0...v0.2.0) (2026-10-07)


### Features

* add .doc as an available export option ([64e779a](https://github.com/zimablue-io/najimu/commit/64e779a66e7137e9f35a1f25121ba3b3222d29ff))
* add connection checking in Header component to monitor API status ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* allow user to manage multiple models, UI changes around settings ([cef3d19](https://github.com/zimablue-io/najimu/commit/cef3d19519fb4c9a2e6f5b3d7dc703454765c1d3))
* **brand:** rename document-localizer to Najimu ([904dc76](https://github.com/zimablue-io/najimu/commit/904dc76ae9b859fcd4362ac92dcd4610b71532c5))
* create document-helpers for reusable components like LocaleSelect and StatusIcon ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* **desktop:** add in-process EmbeddingGemma 2 translation memory ([688c551](https://github.com/zimablue-io/najimu/commit/688c5518a0f21790ef00c8dd8a26cf30e1a3d101))
* enhance EmptyState component with Upload icon and improve file validation ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* enhance error handling and logging, and improve user feedback ([12704fe](https://github.com/zimablue-io/najimu/commit/12704feb44e69f96d152344a28b07d374420f990))
* enhance file dialog options, update model management, and improve UI interactions ([7c60438](https://github.com/zimablue-io/najimu/commit/7c60438f3b3bffa97b1ece306a7c68e46bc64528))
* expand ALL_LOCALES with additional languages and variants for comprehensive localization support ([a6b8d22](https://github.com/zimablue-io/najimu/commit/a6b8d22c0b794e2c333cacce7aa17ff5ca830681))
* implement auto-update functionality with IPC communication ([a492bbc](https://github.com/zimablue-io/najimu/commit/a492bbce89473990ada54bdb34fbcd37fdd7043a))
* implement auto-updater functionality and release workflow for desktop app ([04bddc2](https://github.com/zimablue-io/najimu/commit/04bddc22adf70d5e1be251889bcd38f4b0b01cf4))
* implement DebugBoundary in main.tsx for better error handling during app startup ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* implement locale management with ALL_LOCALES and update settings structure ([59445dd](https://github.com/zimablue-io/najimu/commit/59445ddd65004b1062554ed2f34ed81527983309))
* implement locale validations, remove pause and stop functionality ([32be038](https://github.com/zimablue-io/najimu/commit/32be03870af2b61b67e7520972304a0c69842b81))
* improved seo, fix tests ([98f0939](https://github.com/zimablue-io/najimu/commit/98f0939747aaf5919d72665b543a593100d38cc9))
* init project ([a3dd49c](https://github.com/zimablue-io/najimu/commit/a3dd49c771ebae66e9d1133ef463b81d2fc5f308))
* modify HistoryPanel to include new status types and improve UI elements ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* refactor SettingsModal for better locale management and model editing ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* test if release-please creates a new release tag ([886be10](https://github.com/zimablue-io/najimu/commit/886be10534a7107f7b23ec6f68f171a06aa9d795))
* test release trigger with dummy change ([68ff37f](https://github.com/zimablue-io/najimu/commit/68ff37f379901bacb5e59186a99496e0ac8a44ed))
* update ExportDialog to include accessibility attributes and improve dialog behavior ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* update translation prompt to improve clarity and accuracy requirements ([a416884](https://github.com/zimablue-io/najimu/commit/a4168844b173b273d3077914be7c15f44c7ca869))
* update UI components and styles, refactor API URLs, and add integration tests ([5c8441c](https://github.com/zimablue-io/najimu/commit/5c8441c5dba039ea69586f8ec0f92a28b05fdf33))


### Bug Fixes

* add electron-builder config for macOS DMG build ([7a513b3](https://github.com/zimablue-io/najimu/commit/7a513b3b6bba6dfbe72eba23333db870be6fefc5))
* add ms as explicit dependency for electron-updater ([4f19e35](https://github.com/zimablue-io/najimu/commit/4f19e35863993f68eb39aeda26d7249e744054f7))
* build script now builds core and ui dependencies first ([9d3bfd9](https://github.com/zimablue-io/najimu/commit/9d3bfd9aaaf9809a670a1ab39eb741382eb23f6f))
* **build:** repair tooling, dependencies, and stale build output ([3dc6bfe](https://github.com/zimablue-io/najimu/commit/3dc6bfe16cbc1073273210c5ae42e4730db6787b))
* **desktop:** write Word exports as OOXML .docx ([0e55311](https://github.com/zimablue-io/najimu/commit/0e5531185148ddba91045de426cc07b69be059cd))
* dev server and production build issues ([8e55435](https://github.com/zimablue-io/najimu/commit/8e55435d0e0a6938d01f3fe73a9a769588592e2a))
* Enhance localization prompt handling and validation ([273a36f](https://github.com/zimablue-io/najimu/commit/273a36fdf439e37d1b6b918a21495b1aec5714c3))
* improve error formatting in utils and ensure consistent string handling ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* include dist folder in electron-builder packaging ([e930221](https://github.com/zimablue-io/najimu/commit/e930221047e21718d0aa0504e11c556904c50853))
* move electron to devDependencies and add required fields ([a2df523](https://github.com/zimablue-io/najimu/commit/a2df523310b9f69eb1828ab07575be690a669399))
* prevent page from breaking after user rejects generation changes ([b7bc3f3](https://github.com/zimablue-io/najimu/commit/b7bc3f3ce419fa56edf1879c792dcf1fc5b53ced))
* production build works with base: './' and fix nested button ([08a624b](https://github.com/zimablue-io/najimu/commit/08a624b7f90426a392034bfc6fe7b6996148aebf))
* remove unnecessary useCallback dependencies ([9915183](https://github.com/zimablue-io/najimu/commit/9915183cc893132947ce3e895f1c6e83bc087268))
* resolve lint errors and enable pre-commit hook ([d74cc6d](https://github.com/zimablue-io/najimu/commit/d74cc6dbc1d29df879e280b1d4d46b4981b9f1ff))
* streamline change detection logic for improved readability and performance ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* update localization quality tests for better string handling and consistency ([8ee79d5](https://github.com/zimablue-io/najimu/commit/8ee79d51ccfb75cfb06002ef207af5c128e84a05))
* update publish owner to zimablue-io org ([ecb8c44](https://github.com/zimablue-io/najimu/commit/ecb8c4425d7d3c5f77b83d7c62e5c7f7d5e3f33a))

## Changelog
