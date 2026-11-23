# Wild Bowls · Self-order kiosk (prototype)

Clickable 1080 × 1920 portrait kiosk prototype. It follows the OMK Kiosk V2 journey, uses Burger King's loyalty sign-in as the model for the loyalty step, and takes its branding, menu and photos from Wild Bowls (wild-bowls.com and the Wild Bowls pickup webshop).

**Run:** `python3 -m http.server 8765` in this folder, then open http://localhost:8765

## Journey
1. **Splash**: "Bowls, Smoothies & Brunch." over a looping, silent video of açaí, bowls, coffee and matcha being made (from the wild-bowls.com homepage, `assets/video/wild-bowls-splash.mp4`). Tap anywhere.
2. **Dine in / Take away**: Multicolour 2D illustrations (tray with an açaí bowl and a smoothie; paper bag with greens and a Wild Bowls cup).
3. **Wild Club (loyalty)**: Scan a QR code or enter a short code, see the "Rewards, your way!" tiers, or skip and continue.
4. **Menu**: Category rail (Popular, Açaí bowls, Hearty bowls, Toast & brunch, Build your own, Smoothies, Refreshers, Coffee & matcha, Sweet treats) with **My Offers** and **Scan item** at the bottom, a Harvest Poké autumn promo, a 2-column grid, and a cart bar with item thumbnails and Checkout.
5. **My Offers**: Member card, path to the next tier, visit streak, today's challenge, "Rewards you can use" (redeem a reward to add it to the order), and vouchers (claim or unclaim).
6. **Scan item**: A looping tutorial video of a hand scanning a bottle at the kiosk (`assets/video/scan-tutorial.mp4`; tap it to simulate a scan) for bottled drinks, a list of scanned items with quantities, and "Add to cart".
7. **Item sheet → Customise stepper**: Size (açaí) or Protein (hearty bowls) → Toppings / Extras → Leave out → Related suggestions with this item (sweet treats and drinks shown open; pick a treat, a drink, both or neither. One item is added at its menu price, and a treat plus a drink together become a Wild Combo for CHF 7.90) → Review. Build-your-own bowls and combos open a one-page choice sheet instead.
8. **Checkout upsell**: The cart bar's Checkout opens a full-height bottom sheet titled "Most popular items". It shows 8 crowd favourites as tinted photo cards with an **Add to cart** button (it changes to "In cart · n"), plus a bottom bar with cart thumbnails, the total and **Checkout anyway**.
9. **My Orders (cart)**:
   - Item list, plus **Add more items**, **Scan new item**, and **Discount coupons**.
   - **Tip** for the crew: 2%, 5%, 10%, or a custom amount on a keypad.
   - **You may also like**: a collapsible upsell row.
   - **Promo code** with an on-screen keyboard.
   - **Loyalty discounts**, paid for with points.
   - Summary: sub total, rewards, coupon, promo, loyalty, tip, total incl. 8.1% VAT, and points earned.
10. **Payment**:
   - Select payment type: TWINT QR or "Pay with card", with a 90 s reset.
   - Card: "Use your card for the payment", then "Your transaction is successful".
11. **Thank you**: Order number with a 3-step status, then the receipt choice:
    - Digital: QR code and a phone mock-up of the order page.
    - Paper: "Your receipt is printing" animation, then back to the order-complete screen.
    - "Start over now" resets automatically after 90 s.

**Micro-transitions:**
- Screens slide in, and content rises in a staggered sequence.
- Tapped buttons show a ripple and a press scale.
- The item photo flies into the cart, and the cart badge pops.
- Points numbers count up.
- The QR/short-code tab indicator slides between tabs.
- Steps slide in, and selected options pop a checkmark.
- Removed cart lines slide out.
- The success tick draws itself, and the receipt prints out line by line.
- The scanner laser moves, and the member card has a shine effect.

Also included: a loyalty profile pop-up (tap the member chip in the header) showing the member's name and points available, with **My Offers** and **Sign out**. Signing out keeps the order but removes points rewards and the points discount. Also: start-over confirmation, an allergen guide, a language picker (visual only), a high-contrast accessibility mode (the accessibility button switches the whole kiosk to black on white with solid strokes and a yellow selection highlight; the language and accessibility buttons sit at the bottom of the splash, order-type and loyalty screens), and an idle timeout (90 s, then a 20 s warning).

## Deep links (for reviews)
| Screen | URL hash |
|---|---|
| Loyalty | `#screen=loyalty` · `&modal=signin:code&code=48` · `&modal=welcome` |
| Menu (with cart) | `#screen=menu&demo=1` · `&cat=hearty` |
| Checkout upsell | `#screen=menu&demo=1&modal=popular` |
| My Offers (member / guest) | `#screen=menu&cat=offers&demo=1` · `&demo=guest` |
| Scan item (empty / scanned) | `#screen=scan&demo=1` · `&scanned=1` |
| Item sheet | `#screen=menu&modal=item:harvest-poke` · `item:byo-acai` |
| Customise step | `#screen=custom&item=harvest-poke&step=3` |
| My Orders (member / guest) | `#screen=cart&demo=1` · `#screen=cart&demo=guest` |
| Promo / coupons | `#screen=cart&demo=1&modal=promo` · `&modal=coupons` |
| Payment | `#screen=pay&demo=1` · `&phase=card` · `&phase=success` |
| Thank you | `#screen=done&demo=1` |
| Profile pop-up | `#screen=menu&demo=1&modal=profile` |
| Printing | `#screen=printing&demo=1` |

## Design
- **Brand:** Wild Bowls wordmark and bowl logomark from wild-bowls.com (`assets/wb-logo*.svg`, `assets/wb-mark*.svg`).
- **Type:** Barlow Condensed (OFL, self-hosted) for headings, standing in for the site's Americane Condensed, which needs a commercial licence. Arial / Helvetica for body text, as on the site.
- **Icons:** Google Material Symbols Rounded, plus custom multicolour 2D SVGs for dine in, take away, and the scanner.
- **Colours** (from wild-bowls.com):
  - Aubergine `#382C38`: text and primary buttons.
  - Cream `#F6F4EF`: page background.
  - Sage `#E2E8DF` and `#BFC9BC`: tints. Deeper sage `#6E8468` is the accent.
  - Grey `#696469`: secondary text.
- **Menu & prices:** wild-bowls.com/menu and the pickup webshop (autumn 2026), including sizes, proteins and add-ons. Açaí topping prices, the Wild Combo, rewards, coupons and promo codes (`WILD10`, `LETSBOWL`) are prototype values.
- **Images:** Product photos from the Wild Bowls webshop, plus site photos for the splash and the pancakes crop (`assets/original` = full size, `assets/img` = kiosk size). The Pumpkin & Mushroom Caesar has no photo online, so it shows an icon tile.
- The previous Burger Meister images and logo are kept in `_burger-meister-assets/`.

## Files
`index.html` · `styles.css` · `app.js` (screens, state, flow) · `data.js` (menu, extras, rewards) · `assets/`

## Figma export
The full design (39 screens and pop-ups at 1080 × 1920, as editable layers) is in Figma: OMK KIOSK – V2 → page "⚡ Template V5", grouped in six flow sections.
- `?capture=1` renders the stage at exactly 1080 × 1920 with animations finished (combine with any deep link, e.g. `?capture=1#screen=cart&demo=1`; `&contrast=1` turns on high contrast).
- `tools/figma-export.js` (dev only) converts the rendered screen into an SVG with editable text, vector icons and image fills. Call `figmaExportSVG()` in capture mode, or open `?capture=1&export=1` to write the SVG into a `<textarea id="figma-svg">`.
