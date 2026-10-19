import csv
BASE = "https://neverhollow.online/images/products/"
MEDIA = "https://raw.githubusercontent.com/alveritas/claude/main/shopify/media/drop001/"
url = lambda f: f if f.startswith("http") else BASE + f + ".jpg"
SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
WAISTS = ["28", "30", "32", "34", "36", "38"]
P = [
  dict(handle="feral-zip-hoodie", title="Feral Zip Hoodie", type="Hoodies", price="185.00", sizes=SIZES, size_name="Size",
       qty={"XS": 4, "S": 8, "M": 12, "L": 12, "XL": 9, "XXL": 5},
       desc=["A washed black zip hoodie with the Neverhollow script across the chest, gothic graphics down both sleeves, and a hood lined in black and white leopard pile with frayed edges."],
       fit="Relaxed fit with dropped shoulders, ribbed cuffs and a ribbed hem.",
       colors=[("Obsidian", [(MEDIA+"feral-01-flat.jpg","Feral Zip Hoodie in Obsidian laid flat, with the Neverhollow script across the chest, gothic sleeve graphics and a leopard-lined hood"),
                             (MEDIA+"feral-02-front.jpg","A model in the Feral Zip Hoodie with the hood up and hands in the pocket, against a concrete wall"),
                             (MEDIA+"feral-03-back.jpg","The Feral Zip Hoodie from the back with the hood up: a plain back, with the sleeve graphic wrapping round the arm")])]),
  dict(handle="spine-long-sleeve", title="Spine Long Sleeve", type="Tops", price="95.00", sizes=SIZES, size_name="Size",
       qty={"XS": 2, "S": 4, "M": 6, "L": 6, "XL": 4, "XXL": 3},
       desc=["A long sleeve tee with the Neverhollow script running vertically down the front.",
             "Obsidian is black with the script in white. Bone is white with the script in black."],
       fit="Relaxed fit with dropped shoulders and a ribbed collar.",
       colors=[("Obsidian", [(MEDIA+"spine-01-flat.jpg","Spine Long Sleeve in Obsidian and Bone laid flat, with the Neverhollow script running down the front"),
                             (MEDIA+"spine-02-front.jpg","Two models wearing the Spine Long Sleeve in Obsidian and Bone against a concrete wall, front view"),
                             (MEDIA+"spine-03-back.jpg","Two models wearing the Spine Long Sleeve in Obsidian and Bone, back view, with a plain back")]),
               ("Bone", [])]),
  dict(handle="relic-denim", title="Relic Denim", type="Bottoms", price="165.00", sizes=WAISTS, size_name="Waist",
       qty={"28": 4, "30": 9, "32": 13, "34": 12, "36": 8, "38": 4},
       desc=["Washed black denim with the Neverhollow script running down the left leg, faded whiskering and frayed hems."],
       fit="Wide, straight leg that stacks at the ankle.",
       colors=[("Ash", [(MEDIA+"relic-flat.jpg","Relic Denim in Ash laid flat, with the Neverhollow script running down the left leg"),
                        (MEDIA+"relic-side.jpg","Relic Denim worn with black boots, side view of the script down the leg"),
                        (MEDIA+"relic-hooded.jpg","A model in a hood and Relic Denim leaning on a concrete wall"),
                        (MEDIA+"relic-back.jpg","Relic Denim from the back, with the script running down the outside of the leg")])]),
]
H = ["Title","URL handle","Description","Vendor","Product category","Type","Tags","Published on online store","Status","SKU","Barcode",
     "Option1 name","Option1 value","Option1 LinkedTo","Option2 name","Option2 value","Option2 LinkedTo","Option3 name","Option3 value","Option3 LinkedTo",
     "Price","Compare-at price","Cost per item","Charge tax","Inventory tracker","Inventory quantity","Continue selling when out of stock",
     "Weight value (grams)","Weight unit for display","Requires shipping","Fulfillment service",
     "Product image URL","Image position","Image alt text","Variant image URL","Gift card","SEO title","SEO description","Collection"]
rows=[]
for p in P:
    variants=[(c, s, imgs or p["colors"][0][1]) for c, imgs in p["colors"] for s in p["sizes"]]
    images=[(f, alt) for c, imgs in p["colors"] for f, alt in imgs]
    body="".join(f"<p>{d}</p>" for d in p["desc"]) + f"<p><strong>Fit:</strong> {p['fit']}</p>"
    n=max(len(variants), len(images))
    for i in range(n):
        r={k:"" for k in H}
        r["URL handle"]=p["handle"]
        if i==0:
            r.update({"Title":p["title"],"Description":body,"Vendor":"NEVERHOLLOW","Type":p["type"],"Tags":f"Drop 001, {p['type']}, pre-order",
                      "Published on online store":"TRUE","Status":"Active","Gift card":"FALSE",
                      "SEO title":"","SEO description":p["desc"][0][:300],"Collection":"Drop 001"})
        if i<len(variants):
            c,s,imgs=variants[i]
            if i==0: r.update({"Option1 name":"Color","Option2 name":p["size_name"]})
            r.update({"Option1 value":c,"Option2 value":s,"Price":p["price"],"Charge tax":"TRUE",
                      "Inventory tracker":"shopify","Inventory quantity":str(p["qty"][s] if c not in ("Obsidian","Bone") or p["handle"]!="spine-long-sleeve" else p["qty"][s]),"Continue selling when out of stock":"DENY",
                      "Requires shipping":"TRUE","Fulfillment service":"manual","Variant image URL":url(imgs[0][0])})
        if i<len(images):
            f,alt=images[i]
            r.update({"Product image URL":url(f),"Image position":str(i+1),"Image alt text":alt})
        rows.append(r)
with open("neverhollow-products.csv","w",newline="",encoding="utf-8") as fh:
    w=csv.DictWriter(fh, fieldnames=H); w.writeheader(); w.writerows(rows)
print(len(rows),"rows;", sum(len(p["sizes"])*len(p["colors"]) for p in P),"variants")
