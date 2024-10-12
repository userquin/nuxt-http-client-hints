# Nuxt HTTP Client Hints Module

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Access and use HTTP Client Hints in your Nuxt application. Detect the client browser and the operating system on your server.

## Features

- 🚀 Browser and Operating System detection: check [detect-browser-es](https://www.npmjs.com/package/detect-browser-es) for more information.
- 💥 [Device Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#client_hints) detection
- ⚡ [Network Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#client_hints) detection
- ✨ [Critical Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Client_hints#critical_client_hints) detection

## HTTP Client hints

> [!WARNING]
> The [HTTP Client hints headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Client_hints) listed below are still in draft and only Chromium based browsers support them: Chrome, Edge, Chromium and Opera.


The module includes support for the following HTTP Client hints:
- [Device Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#client_hints)
  - [Device-Memory](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Device-Memory)
- [Network Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#client_hints)
  - [Save-Data](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Save-Data)
  - [Downlink](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Downlink)
  - [ECT](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ECT)
  - [RTT](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/RTT)
- [User Agent Hints](https://github.com/WICG/ua-client-hints)
  - [Sec-CH](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH)
  - [Sec-CH-UA](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA)
  - [Sec-CH-UA-Mobile](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Mobile)
  - [Sec-CH-UA-Platform](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Platform)
  - [Sec-CH-UA-Arch](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Arch)
  - [Sec-CH-UA-Model](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Model)
  - [Sec-CH-UA-Platform-Version](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Platform-Version) 
  - [Sec-CH-UA-Bitness](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Bitness)
- [Critical Client Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Client_hints#critical_client_hints)
  - [Sec-CH-Width](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Width)
  - [Sec-CH-DPR](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-DPR)
  - [Sec-CH-Viewport-Width](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Viewport-Width)
  - [Sec-CH-Viewport-Height](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Viewport-Height) 
  - [Sec-CH-Prefers-Color-Scheme](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Color-Scheme)
  - [Sec-CH-Prefers-Reduced-Motion](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Reduced-Motion)
  - [Sec-CH-Prefers-Reduced-Transparency](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Reduced-Transparency)


## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add nuxt-http-client-hints
```

Add your configuration to your Nuxt config file:

```js
httpClientHints: {
  // Your configuration here
}
```

Add your client and server plugins to your Nuxt application and register the corresponding hooks with your configuration:

```js
// my-plugin.client.js
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('http-client-hints:client-hints', (httpClientHints) => {
    // Your client logic here
  })
})
```

```js
// my-plugin.server.js
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('http-client-hints:ssr-client-hints', (httpClientHints) => {
    // Your server logic here
  })
})
```

You use the httpClientHints object in your application to access the configuration:

```html
<!-- SomeComponent.vue -->
<template>
  <pre>{{ $httpClientHints }}"</pre>
</template>
```

or in your modules, composables, or other plugins:
```js
// my-module.js
const clientHints = useNuxtApp().$httpClientHints
```

That's it! You can now use HTTP Client Hints in your Nuxt app ✨

You can check the source code or the [JSDocs](https://www.jsdocs.io/package/nuxt-http-client-hints) for more information.

## Contribution

<details>
  <summary>Local development</summary>
  
  ```bash
  # Install dependencies
  pnpm install
  
  # Generate type stubs
  pnpm run dev:prepare
  
  # Develop with the playground
  pnpm run dev
  
  # Build the playground
  pnpm run dev:build
  
  # Run ESLint
  pnpm run lint
  
  # Run Vitest
  pnpm run test
  pnpm run test:watch
  ```

</details>


## License

[MIT](./LICENSE) License © 2024-PRESENT [Joaquín Sánchez](https://github.com/userquin)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/nuxt-http-client-hints?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/nuxt-http-client-hints
[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-http-client-hints?style=flat&colorA=18181B&colorB=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/nuxt-http-client-hints
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=18181B&colorB=F0DB4F
[jsdocs-href]: https://www.jsdocs.io/package/nuxt-http-client-hints
[license-src]: https://img.shields.io/github/license/userquin/nuxt-http-client-hints.svg?style=flat&colorA=18181B&colorB=F0DB4F
[license-href]: https://github.com/userquin/nuxt-http-client-hints/blob/main/LICENSE
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com

