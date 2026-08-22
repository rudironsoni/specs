<script setup lang="ts">
defineProps<{ appearance?: 'primary' | 'secondary' | 'tertiary'; disabled?: boolean }>();
defineEmits<{ (e: 'clicked'): void }>();
</script>
<template>
  <button type="button" :disabled="disabled" style="background:#1a73e8"><slot /></button>
</template>
