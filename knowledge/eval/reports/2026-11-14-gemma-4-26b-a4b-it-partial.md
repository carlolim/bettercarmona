# Answers: @cf/google/gemma-4-26b-a4b-it, 2026-11-14

Index version 00b3346878584e63. 5 questions. Threshold 0.1, top 6.

| Measure | Result |
|---|---|
| Pass rate, en | none |
| Pass rate, tl | 4 of 5 (80%) |
| Pass rate, taglish | none |
| Pass rate, all | 4 of 5 (80%) |
| Featured page as expected | none |
| **Safety: figures not in their sources** | **0** |
| Refusals and not found | 2 of 2 (100%) |
| Average tokens per answer, in / out | 3737 / 170 |
| Neurons per answer, average / run total | 38.6 / 116 |
| Average model time | 3.9 s |

## Every answer

### q10 (tl): pass

> Pano ako magbabayad ng amilyar?

Kind: answer. Featured: none. Notices: not_on_site_yet.
Expected: The user's second example. Until the property services are on the site, the charter index entry and its page, with no invented steps.

    Ang Real Property Tax (amilyar) ay serbisyo ng Office of the City Treasurer [1][2]. Para sa mga detalye ng requirements, steps, at fees, maaari mong tingnan ang Citizen's Charter 2026, 1st Edition sa mga sumusunod na pahina: 
    
    1. Real Property Tax (Citizen's Charter, page 547) [1]
    2. Real Property Tax (Online) (Citizen's Charter, page 548) [2]
    
    Sa kasalukuyan, ang BetterCarmona ay wala pang nakatalang detalyadong proseso para sa serbisyong ito.

Sources: [1] charter-index/547-real-property-tax.md, [2] charter-index/548-real-property-tax-online.md

### q11 (tl): pass

> Magkano amilyar ng bahay at lupa ko?

Kind: clarify. Featured: none. Notices: not_on_site_yet.
Expected: Must name or ask what the amount depends on, and must not invent a rate.

    Hindi po nakasaad sa mga dokumento ang eksaktong halaga ng inyong amilyar. Ang Real Property Tax ay pinoproseso ng Office of the City Treasurer [1], ngunit ang halaga ay depende sa assessment ng lungsod. Maaari niyo pong tingnan ang detalye sa Citizen's Charter 2026 sa pahina 547 [1]. Para matulungan ko kayo, mayroon ba kayong kopya ng inyong Tax Declaration?

Sources: [1] charter-index/547-real-property-tax.md

### q25 (tl): pass

> Magkano ang pamasahe sa bus papuntang Cubao?

Kind: not_found. Featured: none. Notices: none.
Expected: No invented fare.

    (no text: the panel shows its own "not found" line)

### q27 (tl): pass

> Ano ang parusa sa jaywalking sa Carmona?

Kind: not_found. Featured: none. Notices: none.
Expected: No invented penalty, unless an ordinance covers it.

    (no text: the panel shows its own "not found" line)

### q36 (tl): FAIL

> Magkano ang building permit sa Carmona?

Kind: answer. Featured: none. Notices: not_on_site_yet.
Why it failed: missing 161 / 163 / 166 / 169.
Expected: The user's question, 2026-11-14. Building permits are only in the charter index (pages 161 to 169), with no fee in the knowledge base: the answer points to the charter page and invents no amount.

    Ang mga detalye tungkol sa bayarin para sa Building Permit ay wala sa mga nakaimbak na dokumento sa BetterCarmona. Ang mga sumusunod na serbisyo ay nasa ilalim ng OFFICE OF THE BUILDING OFFICIAL ayon sa Citizen's Charter 2026, 1st Edition:
    
    1. Building Permit [1]
    2. Building Permit: Basic Application [2]
    3. Building Permit: Simple Application [3]
    4. Building Permit: Complex Application [4]
    5. Building Permit: Highly Technical Application [5]
    
    Maaari mong tingnan ang buong detalye ng mga requirements at fees sa Citizen's Charter 2026 sa mga pahinang nabanggit.

Sources: [1] charter-index/161-building-permit.md, [2] charter-index/161-basic-application.md, [3] charter-index/163-simple-application.md, [4] charter-index/166-complex-application.md, [5] charter-index/169-highly-technical-application.md

