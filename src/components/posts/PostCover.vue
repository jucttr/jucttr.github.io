<script setup lang="ts">
import { t } from "../../i18n";
defineProps<{ kind: string; featured?: boolean }>();
const labels: Record<string, { icon: string; title: string; sub: string }> = {
  astro: {
    icon: "icon-[simple-icons--astro]",
    title: "Astro",
    sub: t("cover.astroSubtitle"),
  },
  vue: {
    icon: "icon-[simple-icons--vuedotjs]",
    title: "Vue.js",
    sub: t("cover.vueSubtitle"),
  },
  css: {
    icon: "icon-[lucide--palette]",
    title: t("cover.cssTitle"),
    sub: t("cover.cssSubtitle"),
  },
  notes: {
    icon: "icon-[lucide--coffee]",
    title: t("cover.notesTitle"),
    sub: t("cover.notesSubtitle"),
  },
  life: {
    icon: "icon-[lucide--sprout]",
    title: t("cover.lifeTitle"),
    sub: t("cover.lifeSubtitle"),
  },
  typescript: {
    icon: "icon-[simple-icons--typescript]",
    title: "TypeScript",
    sub: t("cover.typescriptSubtitle"),
  },
  git: {
    icon: "icon-[simple-icons--git]",
    title: t("cover.gitTitle"),
    sub: t("cover.gitSubtitle"),
  },
  design: {
    icon: "icon-[lucide--sparkles]",
    title: t("cover.designTitle"),
    sub: t("cover.designSubtitle"),
  },
};
</script>
<template>
  <div class="post-cover" :class="[kind, { featured }]" aria-hidden="true">
    <div class="cover-grid"></div>
    <span class="cover-orbit"></span><span class="cover-dot"></span>
    <span class="cover-corner">{{ t("cover.journal") }}</span>
    <span class="cover-icon" :class="labels[kind]?.icon"></span>
    <strong>{{
      featured ? t("cover.featuredTitle") : labels[kind]?.title
    }}</strong>
    <small>{{
      featured ? t("cover.featuredSubtitle") : labels[kind]?.sub
    }}</small>
    <span class="cover-star">✧</span>
  </div>
</template>
<style scoped>
/* Each cover is one pen (--cover-ink); the paper is just card stock tinted by it. */
.post-cover {
  --cover-ink: var(--muted);
  --cover-tint: 7%;
  min-height: 180px;
  height: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--cover-ink);
  background-color: color-mix(
    in srgb,
    var(--cover-ink) var(--cover-tint),
    var(--card)
  );
  background-image: var(--paper);
  padding: 28px 12px;
  isolation: isolate;
}
.cover-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(
      color-mix(in srgb, var(--cover-ink) 22%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--cover-ink) 22%, transparent) 1px,
      transparent 1px
    );
  background-size: 23px 23px;
  z-index: -1;
  mask-image: linear-gradient(30deg, black, transparent 80%);
}
.cover-orbit {
  position: absolute;
  height: 190px;
  width: 190px;
  border: 1px solid color-mix(in srgb, var(--cover-ink) 30%, transparent);
  border-radius: 50%;
  right: -75px;
  top: -80px;
  box-shadow:
    0 0 0 20px color-mix(in srgb, var(--cover-ink) 16%, transparent),
    0 0 0 40px color-mix(in srgb, var(--cover-ink) 9%, transparent);
  z-index: -1;
}
.cover-dot {
  position: absolute;
  bottom: -35px;
  left: -40px;
  border-radius: 50%;
  width: 120px;
  height: 120px;
  background: color-mix(in srgb, var(--cover-ink) 14%, transparent);
}
.cover-corner {
  position: absolute;
  top: 13px;
  left: 15px;
  font:
    7px "Oxanium-Medium",
    var(--font-body);
  letter-spacing: 0.14em;
  opacity: 0.85;
}
.cover-icon {
  display: block;
  font-size: 43px;
  margin: 4px 0 7px;
  opacity: 0.8;
}
strong {
  font:
    600 25px "Oxanium-Medium",
    var(--font-body);
  letter-spacing: -0.6px;
  white-space: nowrap;
}
small {
  font:
    6px "Oxanium-Medium",
    var(--font-body);
  letter-spacing: 0.12em;
  margin-top: 9px;
  opacity: 0.75;
  white-space: nowrap;
}
.cover-star {
  position: absolute;
  font-size: 30px;
  bottom: 16px;
  right: 18px;
  opacity: 0.5;
}
.astro {
  --cover-ink: var(--ink-4);
}
.vue {
  --cover-ink: var(--ink-2);
}
.css {
  --cover-ink: var(--ink-7);
}
.notes {
  --cover-ink: var(--ink-3);
}
.life {
  --cover-ink: var(--ink-5);
}
.typescript {
  --cover-ink: var(--ink-1);
}
.git {
  --cover-ink: var(--ink-8);
}
.design {
  --cover-ink: var(--ink-6);
}
.featured {
  --cover-ink: var(--accent);
}
:global(.dark) .post-cover {
  --cover-tint: 15%;
}
</style>
