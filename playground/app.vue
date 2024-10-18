<template>
  <div>
    <pre>{{ $httpClientHints }}</pre>
    <img
      src="/mountains_1.jpg"
      sizes="22vw"
    >
  </div>
</template>

<script setup lang="ts">
const critical = useNuxtApp().$httpClientHints?.critical
console.log(critical?.devicePixelRatio)
</script>
