<script lang="ts" setup>

import DefaultTheme from 'vitepress/theme'
const { Layout } = DefaultTheme

</script>

<template>
  <layout>
    <template #aside-ads-after>
      <a class="sponsor" href="https://afdian.net/a/shigma" target="_blank">
        点击这里支持作者
      </a>
    </template>
  </layout>
</template>

<style lang="scss" scoped>

.sponsor {
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: center;
  padding: 16px;
  margin-top: 1rem;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  background-color: var(--vp-c-bg-soft);
  transition: color 0.3s ease, background-color 0.3s ease;
}

</style>
