import csv
BASE = "https://neverhollow.online/images/products/"
SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
SLIDE_SIZES = ["US 6–7", "US 8–9", "US 10–11", "US 12–13"]
P = [
  dict(handle="vow-waffle-long-sleeve", title="Vow Waffle Long Sleeve", type="Tops", price="95.00", sizes=SIZES,
       desc=["Our signature long sleeve. Black waffle knit cut oversized, with the Neverhollow script written down both sleeves and an NH monogram label at the neck."],
       fit="Oversized fit with dropped shoulders and ribbed cuffs.",
       colors=[("Black", [("waffle-studio-front-flat","Vow Waffle Long Sleeve laid flat, front, with the NH label at the neck"),
                          ("waffle-studio-front-model","Vow Waffle Long Sleeve in black, worn, front view, with the Neverhollow script down both sleeves"),
                          ("waffle-studio-back-model","Vow Waffle Long Sleeve in black, worn, back view"),
                          ("waffle-studio-back-flat","Vow Waffle Long Sleeve laid flat, back"),
                          ("waffle-studio-nh-label","Close-up of the NH monogram label inside the ribbed collar, on black waffle knit")])]),
  dict(handle="hush-tee", title="Hush Tee", type="Tops", price="70.00", sizes=SIZES,
       desc=["The quiet everyday tee. Oversized and boxy, with the Neverhollow script on the chest and an NH label at the neck.",
             "Obsidian is washed black with the script in white. Bone is washed white with the script in black."],
       fit="Oversized, boxy fit with dropped shoulders.",
       colors=[("Obsidian", [("tee-black-flat","Hush Tee Obsidian laid flat, front, with the NH label at the neck"),
                             ("tee-black-front-model","Hush Tee Obsidian, worn, front view, with the Neverhollow script on the chest"),
                             ("tee-black-back-model","Hush Tee Obsidian, worn, back view")]),
               ("Bone", [("tee-white-flat","Hush Tee Bone laid flat, front, with the NH label at the neck"),
                         ("tee-white-front-model","Hush Tee Bone, worn, front view, with the Neverhollow script on the chest"),
                         ("tee-white-back-model","Hush Tee Bone, worn, back view")])]),
  dict(handle="vigil-fur-zip-hoodie", title="Vigil Fur Zip Hoodie", type="Hoodies", price="185.00", sizes=SIZES,
       desc=["Made for late nights. A black zip hoodie with a fur-trimmed hood, the Neverhollow script across the chest, distressed details on the body and sleeves, and an NH label inside the hood.",
             "Obsidian has a black fur hood. Fawn has a brown fur hood."],
       fit="Boxy, cropped fit with a ribbed hem and cuffs.",
       colors=[("Obsidian", [("hoodie-black-flat","Vigil Fur Zip Hoodie Obsidian laid flat, front, with the NH label inside the hood"),
                             ("hoodie-black-front-model","Vigil Fur Zip Hoodie Obsidian, worn zipped with the black fur hood up, front view"),
                             ("hoodie-black-angle-model","Vigil Fur Zip Hoodie Obsidian, worn zipped with the hood up, seen from above at an angle")]),
               ("Fawn", [("hoodie-brown-flat","Vigil Fur Zip Hoodie Fawn laid flat, front, with the NH label inside the hood"),
                         ("hoodie-brown-front-model","Vigil Fur Zip Hoodie Fawn, worn zipped with the brown fur hood up, front view"),
                         ("hoodie-brown-open-model","Vigil Fur Zip Hoodie Fawn, worn unzipped over a black top, seen from above at an angle")])]),
  dict(handle="drift-track-pants", title="Drift Track Pants", type="Bottoms", price="120.00", sizes=SIZES,
       desc=["Wide, easy and made to move. Track pants with side stripes, an elastic waist, a back patch pocket and the Neverhollow script on the front.",
             "Bone is white with black stripes. Obsidian is black with white stripes."],
       fit="Wide-leg fit with an elastic waist.",
       colors=[("Bone", [("pants-white-flat","Drift Track Pants Bone laid flat, front"),
                         ("pants-white-front-model","Drift Track Pants Bone, worn, front view, with black side stripes and the Neverhollow script on the front"),
                         ("pants-white-back-model","Drift Track Pants Bone, worn, back view, with the back patch pocket")]),
               ("Obsidian", [("pants-black-flat","Drift Track Pants Obsidian laid flat, front"),
                             ("pants-black-front-model","Drift Track Pants Obsidian, worn, front view, with white side stripes and the Neverhollow script on the front"),
                             ("pants-black-back-model","Drift Track Pants Obsidian, worn, back view, with the back patch pocket")])]),
  dict(handle="haven-slides", title="Haven Slides", type="Footwear", price="75.00", sizes=SLIDE_SIZES,
       desc=["For the hours at home. Open-toe slides with a curly textured pile upper and footbed, and the Neverhollow script across the strap.",
             "Bone is white with the script in black. Obsidian is black with the script in white."],
       fit="Sold in paired sizes: each size covers two whole US sizes.",
       colors=[("Bone", [("slides-white-top","A pair of Haven Slides Bone seen from above, with the Neverhollow script on each strap"),
                         ("slides-white-side","A Haven Slide in bone from the side, showing the textured pile and the script on the strap")]),
               ("Obsidian", [("slides-black-top","A pair of Haven Slides Obsidian seen from above, with the Neverhollow script on each strap"),
                             ("slides-black-side","A Haven Slide in obsidian from the side, showing the textured pile and the script on the strap")])]),
]
H = ["Title","URL handle","Description","Vendor","Product category","Type","Tags","Published on online store","Status","SKU","Barcode",
     "Option1 name","Option1 value","Option1 LinkedTo","Option2 name","Option2 value","Option2 LinkedTo","Option3 name","Option3 value","Option3 LinkedTo",
     "Price","Compare-at price","Cost per item","Charge tax","Inventory tracker","Inventory quantity","Continue selling when out of stock",
     "Weight value (grams)","Weight unit for display","Requires shipping","Fulfillment service",
     "Product image URL","Image position","Image alt text","Variant image URL","Gift card","SEO title","SEO description","Collection"]
rows=[]
for p in P:
    variants=[(c, s, imgs) for c, imgs in p["colors"] for s in p["sizes"]]
    images=[(f, alt) for c, imgs in p["colors"] for f, alt in imgs]
    body="".join(f"<p>{d}</p>" for d in p["desc"]) + f"<p><strong>Fit:</strong> {p['fit']}</p>"
    n=max(len(variants), len(images))
    for i in range(n):
        r={k:"" for k in H}
        r["URL handle"]=p["handle"]
        if i==0:
            r.update({"Title":p["title"],"Description":body,"Vendor":"NEVERHOLLOW","Type":p["type"],"Tags":f"Drop 001, {p['type']}",
                      "Published on online store":"TRUE","Status":"Active","Gift card":"FALSE",
                      "SEO title":f"{p['title']} | NEVERHOLLOW","SEO description":p["desc"][0][:300],"Collection":"Drop 001"})
        if i<len(variants):
            c,s,imgs=variants[i]
            if i==0: r.update({"Option1 name":"Color","Option2 name":"Size"})
            r.update({"Option1 value":c,"Option2 value":s,"Price":p["price"],"Charge tax":"TRUE",
                      "Inventory tracker":"shopify","Inventory quantity":"150","Continue selling when out of stock":"DENY",
                      "Requires shipping":"TRUE","Fulfillment service":"manual","Variant image URL":BASE+imgs[0][0]+".jpg"})
        if i<len(images):
            f,alt=images[i]
            r.update({"Product image URL":BASE+f+".jpg","Image position":str(i+1),"Image alt text":alt})
        rows.append(r)
with open("neverhollow-products.csv","w",newline="",encoding="utf-8") as fh:
    w=csv.DictWriter(fh, fieldnames=H); w.writeheader(); w.writerows(rows)
print(len(rows),"rows;", sum(len(p["sizes"])*len(p["colors"]) for p in P),"variants")
