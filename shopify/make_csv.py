import csv
BASE = "https://neverhollow.online/images/products/"
MEDIA = "https://raw.githubusercontent.com/alveritas/claude/main/shopify/media/drop001/"
url = lambda f: f if f.startswith("http") else BASE + f + ".jpg"
SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
WAISTS = ["28", "30", "32", "34", "36", "38", "40", "42", "44", "46"]
P = [
  dict(handle="feral-zip-hoodie", title="Feral Zip Hoodie", type="Hoodies", price="185.00", sizes=SIZES, size_name="Size",
       qty={"XS": 4, "S": 8, "M": 12, "L": 12, "XL": 9, "XXL": 5},
       desc=["A washed black zip hoodie with the Neverhollow script across the chest, gothic graphics down both sleeves, and a hood lined in black and white leopard pile with frayed edges."],
       fit="Relaxed fit with dropped shoulders, ribbed cuffs and a ribbed hem.",
       colors=[("Obsidian", [(MEDIA+"feral-01-flat.jpg","Feral Zip Hoodie in Obsidian laid flat, with the Neverhollow script across the chest, gothic sleeve graphics and a leopard-lined hood"),
                             (MEDIA+"feral-02-front.jpg","A model in the Feral Zip Hoodie with the hood up and hands in the pocket, against a concrete wall"),
                             (MEDIA+"feral-03-back.jpg","The Feral Zip Hoodie from the back with the hood up: a plain back, with the sleeve graphic wrapping round the arm")])]),
  dict(men=True, handle="spine-long-sleeve", title="Spine Long Sleeve", type="Tops", price="65.00", sizes=SIZES, size_name="Size",
       qty={"XS": 2, "S": 4, "M": 6, "L": 6, "XL": 4, "XXL": 3},
       desc=["A long sleeve tee with the Neverhollow script running vertically down the front.",
             "Obsidian is black with the script in white. Bone is white with the script in black."],
       fit="Relaxed fit with dropped shoulders and a ribbed collar.",
       colors=[("Obsidian", [(MEDIA+"spine-01-flat.jpg","Spine Long Sleeve in Obsidian and Bone laid flat, with the Neverhollow script running down the front"),
                             (MEDIA+"spine-02-studio.jpg","A model in the Spine Long Sleeve in Bone, standing, with the Neverhollow script running down the front"),
                             (MEDIA+"spine-03-seated.jpg","A model in the Spine Long Sleeve in Bone sitting on a white floor")]),
               ("Bone", [])]),
  dict(men=True, handle="vesper-polo", title="Vesper Polo", type="Tops", price="60.00", sizes=SIZES, size_name="Size",
       qty=None,
       desc=["A short sleeve polo with the Neverhollow script sweeping across the chest and onto the sleeve.",
             "Obsidian is black with the script in white. Bone is white with the script in black."],
       fit="Relaxed, boxy fit with a flat collar and a two-button placket.",
       colors=[("Obsidian", [(MEDIA+"vesper-01-flat.jpg","Vesper Polo in Obsidian and Bone laid flat, with the Neverhollow script across the chest and onto the sleeve"),
                             (MEDIA+"vesper-02-standing.jpg","A model in the Vesper Polo in Obsidian with white jeans, against a white wall"),
                             (MEDIA+"vesper-03-lying.jpg","The Vesper Polo in Obsidian worn lying on a white floor, with the script across the chest")]),
               ("Bone", [])]),
  dict(women=True, handle="veil-cropped-long-sleeve", title="Veil Cropped Long Sleeve", type="Tops", price="40.00", sizes=SIZES, size_name="Size",
       qty=None,
       desc=["A cropped long sleeve with the Neverhollow script across the chest in white."],
       fit="Fitted and cropped above the waist, with a crew neck.",
       colors=[("Obsidian", [(MEDIA+"veil-01-flat.jpg","Veil Cropped Long Sleeve in Obsidian laid flat, with the Neverhollow script across the chest"),
                             (MEDIA+"veil-04-standing.jpg","A model in the Veil Cropped Long Sleeve, standing, with the Neverhollow script across the chest"),
                             (MEDIA+"veil-05-standing-back.jpg","The Veil Cropped Long Sleeve from the back: a plain back, cropped above the waist")])]),
  dict(men=True, handle="seraph-half-zip", title="Seraph Half-Zip", type="Tops", price="75.00", sizes=SIZES, size_name="Size",
       qty=None,
       desc=["A half-zip pullover with a ribbed stand collar, a metal zip and the nh label at the neck.", "Slate is a charcoal grey."],
       fit="Dropped shoulders, with ribbed cuffs and hem.",
       colors=[("Slate", [(MEDIA+"litany-01-flat.jpg","Seraph Half-Zip in Slate laid flat, with the nh label at the neck"),
                          (MEDIA+"litany-02-front.jpg","A model in the Seraph Half-Zip in Slate, standing, with the collar up"),
                          (MEDIA+"litany-03-back.jpg","The Seraph Half-Zip in Slate from the back: a plain back")])]),
  dict(men=True, handle="relic-denim", title="Relic Denim", type="Bottoms", price="100.00", sizes=WAISTS, size_name="Waist",
       qty={"28": 4, "30": 9, "32": 13, "34": 12, "36": 8, "38": 4, "40": 4, "42": 3, "44": 2, "46": 2},
       desc=["Washed black denim with the Neverhollow script running down the left leg, faded whiskering and frayed hems."],
       fit="Wide, straight leg that stacks at the ankle.",
       colors=[("Ash", [(MEDIA+"relic-flat.jpg","Relic Denim in Ash laid flat, with the Neverhollow script running down the left leg"),
                        (MEDIA+"relic-02-studio.jpg","A model in Relic Denim, standing, with the Neverhollow script running down the leg"),
                        (MEDIA+"relic-03-seated.jpg","A model in Relic Denim sitting on a white floor, with the script running down the leg")])]),
  dict(women=True, handle="halo-fitted-polo", title="Halo Fitted Polo", type="Tops", price="40.00", sizes=SIZES, size_name="Size",
       qty=None,
       desc=["A fitted short sleeve polo with the Neverhollow script sweeping across the chest.",
             "Obsidian is black with the script in white. Bone is white with the script in black."],
       fit="Fitted, with a collar and a button placket.",
       colors=[("Obsidian", [(MEDIA+"halo-01-flat.jpg","Halo Fitted Polo in Obsidian and Bone laid flat, with the Neverhollow script across the chest"),
                             (MEDIA+"halo-02-standing.jpg","A model in the Halo Fitted Polo in Obsidian, standing, with the Neverhollow script across the chest"),
                             (MEDIA+"halo-03-lying.jpg","A model in the Halo Fitted Polo in Obsidian lying on a white rug"),
                             (MEDIA+"halo-04-back.jpg","The Halo Fitted Polo in Obsidian from the back")]),
               ("Bone", [])]),
  dict(women=True, handle="requiem-sweatpants", title="Requiem Sweatpants", type="Bottoms", price="55.00", sizes=SIZES, size_name="Size",
       qty=None,
       desc=["Sweatpants with the Neverhollow script across the back.",
             "Obsidian is black with the script in white. Bone is white with the script in black."],
       fit="Straight leg with an elastic waistband.",
       colors=[("Obsidian", [(MEDIA+"requiem-01-flat.jpg","Requiem Sweatpants in Obsidian and Bone laid flat, with the Neverhollow script across the back"),
                             (MEDIA+"requiem-02-standing.jpg","A model in the Requiem Sweatpants in Obsidian, standing, seen from the back with the Neverhollow script"),
                             (MEDIA+"requiem-05-lying.jpg","A model in the Requiem Sweatpants in Obsidian lying on a white floor, with the script across the back"),
                             (MEDIA+"requiem-04-seated.jpg","A model in the Requiem Sweatpants in Obsidian sitting on a white floor")]),
               ("Bone", [])]),
  dict(men=True, handle="sigil-hoodie", title="Sigil Hoodie", type="Hoodies", price="80.00", sizes=SIZES, size_name="Size",
       qty=None,
       desc=["A pullover hoodie with the NH monogram on the left chest and a plain back.",
             "Obsidian is black with the monogram in white."],
       fit="Relaxed, with dropped shoulders, a drawstring hood, a kangaroo pocket and ribbed cuffs and hem.",
       colors=[("Obsidian", [(MEDIA+"sigil-01-flat.jpg","Sigil Hoodie in Obsidian laid flat, with the NH monogram on the left chest"),
                             (MEDIA+"sigil-02-standing.jpg","A model in the Sigil Hoodie in Obsidian, standing, with the NH monogram on the chest"),
                             (MEDIA+"sigil-03-back.jpg","The Sigil Hoodie in Obsidian from the back: a plain back")])]),
  dict(women=True, handle="cathedral-dress", title="Cathedral Dress", type="Dresses", price="60.00", sizes=SIZES, size_name="Size",
       qty=None,
       desc=["A long sleeve mini dress with a gothic cross on the hip, the Neverhollow script running through it.",
             "Obsidian is black with the cross in white."],
       fit="Fitted, with a crew neck and long sleeves.",
       colors=[("Obsidian", [(MEDIA+"cathedral-01-flat.jpg","Cathedral Dress in Obsidian laid flat, with a gothic cross and the Neverhollow script on the hip"),
                             (MEDIA+"cathedral-02-seated.jpg","A model in the Cathedral Dress in Obsidian sitting on a white floor, the cross across her hip"),
                             (MEDIA+"cathedral-03-lying.jpg","A model in the Cathedral Dress in Obsidian lying on a white floor")])]),
  dict(men=True, handle="psalm-henley", title="Psalm Henley", type="Tops", price="40.00", sizes=SIZES, size_name="Size",
       qty=None,
       desc=["A long sleeve henley with a two-button placket and the NH monogram on the left chest.",
             "Obsidian is black with the monogram in white. Bone is white with the monogram in black."],
       fit=None,
       colors=[("Obsidian", [(MEDIA+"psalm-01-flat.jpg","Psalm Henley in Obsidian and Bone laid flat, with the NH monogram on the left chest"),
                             (MEDIA+"psalm-02-front.jpg","A model in the Psalm Henley in Bone, with the NH monogram on the chest"),
                             (MEDIA+"psalm-03-back.jpg","The Psalm Henley in Bone from the back: a plain back")]),
               ("Bone", [])]),
  dict(men=True, handle="scripture-sweatpants", title="Scripture Sweatpants", type="Bottoms", price="65.00", sizes=SIZES, size_name="Size",
       qty=None,
       desc=["Sweatpants with the Neverhollow script running down the left leg.",
             "Obsidian is black with the script in white."],
       fit="Relaxed, with a straight leg, an elastic waistband and side pockets.",
       colors=[("Obsidian", [(MEDIA+"scripture-01-flat.jpg","Scripture Sweatpants in Obsidian laid flat, with the Neverhollow script running down the left leg"),
                             (MEDIA+"scripture-02-front.jpg","A model in the Scripture Sweatpants in Obsidian, standing, with the script running down the leg"),
                             (MEDIA+"scripture-03-side.jpg","The Scripture Sweatpants in Obsidian from the side, with the script running down the leg")])]),
  dict(men=True, handle="chapel-shorts", title="Chapel Shorts", type="Bottoms", price="50.00", sizes=SIZES, size_name="Size",
       qty=None,
       desc=["Fleece shorts with the NH monogram on the left leg and raw, frayed hems.",
             "Obsidian is black with the monogram and drawstring in cream."],
       fit="Relaxed and long, falling below the knee, with an elastic waistband, a drawstring and side pockets.",
       colors=[("Obsidian", [(MEDIA+"chapel-01-flat.jpg","Chapel Shorts in Obsidian laid flat, with the NH monogram on the left leg and frayed hems"),
                             (MEDIA+"chapel-02-front.jpg","A model in the Chapel Shorts in Obsidian, standing, with the NH monogram on the leg"),
                             (MEDIA+"chapel-03-seated.jpg","A model in the Chapel Shorts in Obsidian lying on a white floor"),
                             (MEDIA+"chapel-04-back.jpg","The Chapel Shorts in Obsidian from the back: a plain back")])]),
]
# newest first (the shop's own order is set in the Drop 001 collection)
ORDER = ["vesper-polo", "relic-denim", "veil-cropped-long-sleeve", "requiem-sweatpants", "seraph-half-zip", "scripture-sweatpants", "halo-fitted-polo", "cathedral-dress", "psalm-henley", "chapel-shorts", "spine-long-sleeve", "sigil-hoodie"]  # feral-zip-hoodie archived
P = [p for h in ORDER for p in P if p["handle"] == h]
H = ["Title","URL handle","Description","Vendor","Product category","Type","Tags","Published on online store","Status","SKU","Barcode",
     "Option1 name","Option1 value","Option1 LinkedTo","Option2 name","Option2 value","Option2 LinkedTo","Option3 name","Option3 value","Option3 LinkedTo",
     "Price","Compare-at price","Cost per item","Charge tax","Inventory tracker","Inventory quantity","Continue selling when out of stock",
     "Weight value (grams)","Weight unit for display","Requires shipping","Fulfillment service",
     "Product image URL","Image position","Image alt text","Variant image URL","Gift card","SEO title","SEO description","Collection"]
rows=[]
for p in P:
    variants=[(c, s, imgs or p["colors"][0][1]) for c, imgs in p["colors"] for s in p["sizes"]]
    images=[(f, alt) for c, imgs in p["colors"] for f, alt in imgs]
    body="".join(f"<p>{d}</p>" for d in p["desc"]) + (f"<p><strong>Fit:</strong> {p['fit']}</p>" if p.get("fit") else "")
    n=max(len(variants), len(images))
    for i in range(n):
        r={k:"" for k in H}
        r["URL handle"]=p["handle"]
        if i==0:
            r.update({"Title":p["title"],"Description":body,"Vendor":"NEVERHOLLOW","Type":p["type"],"Tags":f"Drop 001, {p['type']}, pre-order" + (", Women" if p.get("women") else "") + (", Men" if p.get("men") else ""),
                      "Published on online store":"TRUE","Status":"Active","Gift card":"FALSE",
                      "SEO title":"","SEO description":p["desc"][0][:300],"Collection":"Drop 001"})
        if i<len(variants):
            c,s,imgs=variants[i]
            if i==0: r.update({"Option1 name":"Color","Option2 name":p["size_name"]})
            r.update({"Option1 value":c,"Option2 value":s,"Price":p["price"],"Charge tax":"TRUE",
                      "Inventory tracker":"shopify" if p["qty"] and s in p["qty"] else "","Inventory quantity":str(p["qty"][s]) if p["qty"] and s in p["qty"] else "","Continue selling when out of stock":"DENY",
                      "Requires shipping":"TRUE","Fulfillment service":"manual","Variant image URL":url(imgs[0][0])})
        if i<len(images):
            f,alt=images[i]
            r.update({"Product image URL":url(f),"Image position":str(i+1),"Image alt text":alt})
        rows.append(r)
with open("neverhollow-products.csv","w",newline="",encoding="utf-8") as fh:
    w=csv.DictWriter(fh, fieldnames=H); w.writeheader(); w.writerows(rows)
print(len(rows),"rows;", sum(len(p["sizes"])*len(p["colors"]) for p in P),"variants")
