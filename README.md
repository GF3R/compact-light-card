# Compact Light Card

Minimal Lovelace card that shows multiple lights with sliders in a single card.

## Install (HACS)
- Add as a custom repository (type: Lovelace)
- Install and add the resource

Resource URL:
```
/your-path/compact-light-card.js
```

## Usage
```yaml
type: custom:compact-light-card
name: Living Room
entities:
  - light.lamp
  - light.floor
```

## Development
```bash
npm install
npm run build
```
The build output is in `dist/compact-light-card.js`.
