<script setup>
import { state } from '../composables/useStore.js'
import Icon from './Icon.vue'

const ICONS = {
  success: 'check',
  warning: 'shield',
  info: 'wave',
}
</script>

<template>
  <Transition name="toast">
    <div v-if="state.toast" :key="state.toast.id" class="toast" :class="`is-${state.toast.tone}`">
      <span class="toast__icon">
        <Icon :name="ICONS[state.toast.tone] || 'wave'" :size="13" />
      </span>
      <span>{{ state.toast.message }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  right: 20px;
  bottom: calc(var(--player-h) + 16px);
  z-index: 200;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  max-width: min(420px, calc(100vw - 40px));
  padding: 10px 16px 10px 12px;
  border-radius: var(--r-pill);
  background: #2a2a2a;
  color: var(--text-base);
  font-size: 12.5px;
  font-weight: 600;
  box-shadow: var(--shadow-heavy);
}
.toast__icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(30, 215, 96, 0.16);
  color: var(--accent);
  flex: 0 0 auto;
}
.toast.is-warning .toast__icon {
  background: rgba(255, 164, 43, 0.16);
  color: var(--warning);
}
.toast.is-info .toast__icon {
  background: rgba(83, 157, 245, 0.16);
  color: var(--info);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s var(--ease), transform 0.2s var(--ease);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 900px) {
  .toast {
    right: 12px;
    left: 12px;
    bottom: 96px;
    max-width: none;
  }
}
</style>
