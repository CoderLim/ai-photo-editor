# Chrome Web Store publish checklist

## 1. Load unpacked (local smoke test)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `chrome-extension/` folder (this directory’s parent)
4. Click the extension icon: add photos, type a prompt, click **Open GetAIPhotoEditor**
5. Confirm a new tab opens `https://getaiphotoeditor.com`

## 2. Build the zip (do not include `store/`)

From the repo root:

```bash
cd chrome-extension
zip -r ../getaiphotoeditor-extension.zip . \
  -x 'store/*' \
  -x '*.DS_Store' \
  -x '*/.DS_Store'
```

Upload `getaiphotoeditor-extension.zip` in the
[Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## 3. Store listing fields

| Field                        | Value                                                                  |
| ---------------------------- | ---------------------------------------------------------------------- |
| Name                         | GetAIPhotoEditor                                                       |
| Short / detailed description | See `description.md`                                                   |
| Icon                         | `icons/icon-128.png` (store may also ask for a 128×128 marketing icon) |
| Privacy policy URL           | `https://getaiphotoeditor.com/privacy-policy`                          |
| Support email                | `support@getaiphotoeditor.com`                                         |
| Homepage                     | `https://getaiphotoeditor.com`                                         |

Extension-only privacy summary (optional host or attach): `privacy.html`

## 4. Screenshots & promo tiles

Ready-made assets (JPEG, no alpha) in `store/assets/`:

| Field              | File                         | Size     |
| ------------------ | ---------------------------- | -------- |
| Screenshots        | `screenshot-1280x800.jpg`    | 1280×800 |
| Small promo tile   | `promo-small-440x280.jpg`    | 440×280  |
| Marquee (optional) | `promo-marquee-1400x560.jpg` | 1400×560 |
| Store icon         | `store-icon-128.png`         | 128×128  |

Drag these into the Store listing upload fields.

## 5. Privacy questionnaire

Answer consistently with MVP behavior:

- **Does not** collect user data
- **Does not** sell / transfer data
- Single purpose: companion UI that opens the GetAIPhotoEditor website
- No remote code, no host permissions, no content scripts

## 6. Submit

Pay the one-time Chrome Web Store developer registration fee if you have not already, then submit for review. Review often takes a few business days.
