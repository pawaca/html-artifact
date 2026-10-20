# References and third-party notices

The publisher uses the documented [here.now API](https://here.now/docs).
No here.now SDK, installer, or skill code is bundled.

[ThariqS/html-effectiveness](https://github.com/ThariqS/html-effectiveness)
was a conceptual reference for HTML reports and explanations. Its example
code, screenshots, and datasets are not bundled in this repository.

The project's [MIT License](LICENSE) covers its own contributions, not
user-supplied content or third-party material in generated artifacts.

## UI canvas runtime

The UI canvas bundles selected parts of [OpenPencil](https://github.com/open-pencil/open-pencil)
0.16.0 (MIT), CanvasKit 0.41.1 (BSD-3-Clause), and the OpenPencil Yoga fork (MIT).
It includes Inter and, when required, a Simplified Chinese subset of Noto Sans SC
(SIL Open Font License 1.1). OpenPencil's complete application is not included.

The build's exact package inventory, versions, source provenance and asset hashes
are in [manifest.json](assets/ui-canvas/vendor/manifest.json). Full notices for
bundled code and fonts are retained in [LICENSES.txt](assets/ui-canvas/vendor/LICENSES.txt)
and embedded into every generated UI canvas HTML.

The Inter notice comes from OpenPencil's `tests/fixtures/fonts/Inter-OFL.txt`;
the Yoga notice is retained from [its source repository](https://github.com/open-pencil/yoga/blob/main/LICENSE)
because the published Yoga package omits that file. Noto Sans SC font files and
their OFL notice come from `@fontsource/noto-sans-sc` 5.3.1. The browser does not
contact these providers. Fonts, upstream code, and user-supplied design material
retain their own licenses; the root MIT license does not replace them.
