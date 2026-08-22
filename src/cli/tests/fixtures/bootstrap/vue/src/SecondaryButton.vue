<script setup lang="ts">
defineProps<{ appearance?: 'primary' | 'secondary' }>();
defineEmits<{ (e: 'pressed'): void }>();
</script>
<template>
  <button type="button" style="background:#1a73e8"><slot /></button>
</template>
