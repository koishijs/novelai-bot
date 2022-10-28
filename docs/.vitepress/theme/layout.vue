<script lang="ts" setup>

import DefaultTheme from 'vitepress/theme'
const { Layout } = DefaultTheme

</script>

<template>
  <layout>
    <template #aside-ads-after>
      <div class="sponsor">
        <p>如果您愿意支持我们，<br/>请扫描下方的二维码，<br/>我们将继续努力维护这个项目。</p>
        <div class="image wechat"></div>
        <div class="image alipay"></div>
      </div>
    </template>
  </layout>
</template>

<style lang="scss" scoped>

.sponsor {
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: center;
  padding: 24px;
  gap: 16px;
  margin-top: 1rem;
  border-radius: 12px;
  min-height: 240px;
  line-height: 18px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  background-color: var(--vp-c-bg-soft);
  transition: color 0.3s ease, background-color 0.3s ease;

  .image {
    width: 8rem;
    height: 8rem;
    background-size: contain;
    background-color: inherit;

    &.wechat {
      background-image: url('https://cdn-shiki.momobako.com:444/static/sponsor/wechat.webp');
    }

    &.alipay {
      background-image: url('https://cdn-shiki.momobako.com:444/static/sponsor/alipay.webp');
    }
  }
}

</style>
