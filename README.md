# Procurement Risk Dashboard

Internal SAPUI5/Fiori-style dashboard for monitoring supplier payment risk.

The app gives a quick overview of:

- payment reliability across suppliers
- risk status based on delay patterns (Green / Yellow / Red)
- delay distribution by supplier and by country
- supplier-level drill-down with order data

---

## Technology stack

- **Frontend framework:** SAPUI5
- **Language:** JavaScript (`sap.ui.define`)
- **Views:** XML (`sap.m`, `sap.f`)

---

## Project structure

```text
webapp/
├── Component.js
├── manifest.json
├── index.html
├── controller/
│   ├── App.controller.js
│   ├── BaseController.js
│   ├── Dashboard.controller.js
│   ├── SupplierList.controller.js
│   └── SupplierDetail.controller.js
├── view/
│   ├── App.view.xml
│   ├── Dashboard.view.xml
│   ├── SupplierList.view.xml
│   └── SupplierDetail.view.xml
├── service/
│   └── supplierRiskService.js
├── util/
│   ├── formatter.js
│   └── exportUtil.js
├── i18n/
│   ├── i18n.properties
│   └── i18n_en.properties
└── css/
    └── style.css
```

---

## Risk model 

Risk is based on actual payment behavior, not manually assigned.

- Green: mostly on-time payments or small delays (≤ 3 days)
- Yellow: repeated delays between 3–10 days
- Red: serious delays (>10 days) or repeated issues

All logic is implemented in: `supplierRiskService.js`

---

## Routes

- `#/` dashboard
- `#/suppliers` supplier register
- `#/suppliers/{supplierId}` supplier detail

---

## Run locally

Serve the `webapp` folder with any static server.

### Python

```bash
cd webapp
python -m http.server 8765
```

### Node

```bash
cd webapp
npx --yes serve -l 8765 .
```

Then open:

- `http://localhost:8765/index.html`

---

