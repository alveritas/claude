"""Ad copy for NEVERHOLLOW drop 001. Every fact here is from the live store: names, colours, sizes,
pre-order dates (close nov 5, 2026; ships by jan 15, 2027), shipping ($8 us, free over $100, $35 elsewhere),
the welcome code (25% off a first order for joining the list) and the site's own 'one production run' line."""

SITE = "https://www.neverhollow.online"
def link(path, src, med="paid"):
    return f"{SITE}{path}?utm_source={src}&utm_medium={med}&utm_campaign=drop001"

META = {
  "primary": [
    ("drop 001, lineup and video ads", "drop 001 is open for pre-order until november 5. join the list for 25% off your first order."),
    ("drop 001, lineup and video ads", "twelve pieces, made in one production run once pre-orders close. every order ships by january 15."),
    ("relic denim ad", "relic denim. washed black, the neverhollow script down the left leg. waist 28–46. pre-orders close november 5."),
    ("cathedral dress ad", "the cathedral dress. a long sleeve mini with a gothic cross on the hip. xs–xxl. pre-orders close november 5."),
  ],
  "headline": ["drop 001 · pre-order now", "25% off your first order", "pre-orders close nov 5"],
  "description": ["ships by january 15", "us shipping free over $100"],
}
TIKTOK = {
  "text": ["drop 001 pre-orders close november 5. join the list for 25% off your first order.",
           "twelve pieces. one production run. pre-order before november 5."],
}
GOOGLE = {
  "headline": ["neverhollow", "neverhollow drop 001", "pre-order drop 001 now", "pre-orders close nov 5",
               "25% off your first order", "ships by january 15", "script polos, denim & sweats",
               "relic denim, waist 28–46", "the cathedral dress", "official neverhollow store"],
  "description": ["drop 001 is open for pre-order until november 5. every order ships by january 15.",
                  "join the list for 25% off your first order. us shipping $8, free over $100.",
                  "twelve pieces: polos, denim, sweatpants, a hoodie, a dress and more.",
                  "ships worldwide. pre-order now at neverhollow.online."],
  "keywords": ["[neverhollow]", "\"never hollow\"", "\"neverhollow clothing\"", "\"neverhollow drop 001\""],
}
LIMITS = {"meta.primary": 125, "meta.headline": 40, "meta.description": 30, "tiktok.text": 100,
          "google.headline": 30, "google.description": 90}

if __name__ == "__main__":
    bad = 0
    for k, lim in LIMITS.items():
        plat, field = k.split(".")
        items = {"meta": META, "tiktok": TIKTOK, "google": GOOGLE}[plat][field]
        for it in items:
            t = it[1] if isinstance(it, tuple) else it
            ok = len(t) <= lim; bad += not ok
            print(f"{'ok ' if ok else 'OVER'} {len(t):3d}/{lim} {k:18s} {t}")
    print("over limit:", bad)
