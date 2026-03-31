Path 3 v1
- Left studio pane and assistant promo are now separate vertical zones.
- Center canvas frame removed. Cards render directly over wallpaper in PreviewPane.
- Desktop and mobile renderers are split:
  - src/ui/components/PreviewPane.tsx
  - src/mobile/components/MobilePreviewPane.tsx
- Mobile deployment specs are split:
  - functions/api/deploy.js
  - functions/api/deploy-mobile.js
  - tenants/<slug>/desktop/*
  - tenants/<slug>/mobile/*

## Dev Notes

### [2026-03-25] brandCenter removed from topStrip
- Removed `<div className="brandCenter">XYZ LABS</div>` and its CSS from App.tsx.
- The brandCenter slot (center column of the topStrip 3-column grid) is reserved for the skin/theme system — it will display a tenant brand name or logo injected via skin config.
- Deferred: UI layout and core function are priority. Restore brandCenter when skin system is wired up.
- Related CSS class `.brandCenter` in styles.css left in place for when the feature returns.
