# References and third-party notices

## Netlify CLI — MIT

The anonymous publishing protocol in `scripts/publish.sh` was implemented in
shell with reference to Netlify CLI's
[drop-api.ts](https://github.com/netlify/cli/blob/main/src/utils/deploy/drop-api.ts).
The upstream TypeScript file is not bundled. We retain the upstream MIT notice
for the referenced/adapted publishing flow. The shell implementation adds local
snapshots, receipts, same-deployment recovery and HTTPS URL selection.

Source license: https://github.com/netlify/cli/blob/main/LICENSE

> Copyright (c) 2016 Netlify
>
> MIT License
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of
> this software and associated documentation files (the "Software"), to deal in
> the Software without restriction, including without limitation the rights to
> use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
> the Software, and to permit persons to whom the Software is furnished to do so,
> subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

## HTML as an output format — conceptual reference

[ThariqS/html-effectiveness](https://github.com/ThariqS/html-effectiveness)
demonstrates standalone HTML for reports, explanations and review surfaces.
That example collection is Apache-2.0; its numbered examples carry
`Copyright 2026 Anthropic PBC` notices.

This repository does not bundle that collection's HTML files, screenshots,
sample narratives, or example datasets. It provides a compact generic starter
and instructions for writing task-specific documents. A similar output format
or a general layout idea is not a claim to ownership of the source examples.

If a contributor later copies or adapts example code, preserve the applicable
copyright notices, distribute the Apache-2.0 license, mark modifications, and
retain any applicable upstream NOTICE. Do not relabel such material as solely
MIT. See [Apache-2.0 section 4](https://www.apache.org/licenses/LICENSE-2.0).

## Scope of the source review

For the initial public release, the local skill files, the generic starter,
Netlify CLI's protocol implementation/license, and the HTML example
collection/license were inspected. The initial local skill had no recorded
upstream revision or license header; this is not a complete provenance audit of
every earlier model input or every generated artifact, nor a guarantee of
non-infringement. Please identify the file and original source if you find a
missing attribution.

The MIT license applies to this project's licensable contributions. It does not
grant rights in user-supplied content or third-party material in generated
artifacts. Generated reports and private session data are not included here.

For background on the distinction between expression and ideas/methods, see the
[U.S. Copyright Office overview](https://www.copyright.gov/what-is-copyright/).
This source review is practical documentation, not legal advice.
