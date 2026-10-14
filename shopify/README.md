# NEVERHOLLOW on Shopify

- `theme/` — the NEVERHOLLOW Shopify theme (upload as a zip: Online Store → Themes → Add theme → Upload zip file; zip the *contents* of this folder).
- `neverhollow-products.csv` — the Drop 001 catalogue for Products → Import: one product per piece, Color and Size options, prices, 150 in stock per size, photos pulled from neverhollow.online during the import.
- `make_csv.py` — rebuilds the CSV.

Pages the theme expects (Online Store → Pages, choose the template on the right): About (`page.about`), FAQ (`page.faq`), Contact (`page.contact`).
Shipping and returns lines shown on product pages are in Customize → Theme settings → Shipping and returns lines; keep them in step with Settings → Shipping and delivery and your refund policy.
