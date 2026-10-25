# Nordlys – Nordic stock analysis

Your own website for analysing Nordic companies (mostly Swedish) with 8 AI prompts.
It runs for free on **GitHub Pages**, so you can open it from any phone or computer.

- **Overview** – facts, price chart vs the local index (OMXS30 for Sweden), and a summary of all 8 analyses
- **8 analysis tabs** – Phase, Business, Moat, Long-Term, Key Metrics, Risk, Valuation, Price & Sentiment. Each tab shows charts and traffic lights at the top and the full AI text below.
- **Prices update by themselves** every weekday evening.

> ⚠️ For personal research only – not investment advice. Always open a couple of the source links and check the numbers yourself.

---

## What's in the folder

| Folder / file | What it is |
|---|---|
| `index.html`, `company.html` | The two web pages |
| `assets/` | Design (CSS), code (JS), logo and chart libraries – you never need to touch these |
| `prompts/` | The 8 prompts, rewritten for Nordic companies |
| `data/companies.json` | **Your list of companies** – you edit this |
| `data/analyses/<ID>/` | **The AI answers** – one file per analysis |
| `data/prices/` | Prices – the robot writes these, don't edit them |
| `scripts/update_prices.py` + `.github/workflows/update-prices.yml` | The price robot |

---

## PART A – Put the site online (one time, about 20 minutes)

### Step 1 – Make a GitHub account
1. Go to **github.com/signup** and create a free account.
2. Pick a short username – it becomes part of your web address (`https://USERNAME.github.io/nordlys/`).

### Step 2 – Create an empty repository ("repo" = a project folder on GitHub)
1. Click the **+** (top right) → **New repository**.
2. Repository name: `nordlys`
3. Choose **Public** (free GitHub Pages needs public. Anyone *with the link* can see the site.)
4. Leave all checkboxes empty. Click **Create repository**.

### Step 3 – Upload the files
1. Unzip `nordlys.zip` on your computer.
2. On the new, empty repo page, click the link **"uploading an existing file"**.
3. Open the unzipped `nordlys` folder and select **everything inside it** (`index.html`, `company.html`, `config.js`, `README.md` and the folders `assets`, `data`, `prompts`, `scripts`). Drag them into the browser window.
4. Wait until all files are listed, then click **Commit changes** at the bottom.

> 💡 On a Mac, files and folders whose names start with a dot (`.github`, `.nojekyll`) are hidden in Finder and usually don't get uploaded. That's why Step 4 exists.

### Step 4 – Add the price robot (the hidden `.github` folder)
1. In your repo, click **Add file → Create new file**.
2. In the name box type exactly: `.github/workflows/update-prices.yml`
   (typing `/` automatically makes folders).
3. Open the file `.github/workflows/update-prices.yml` from the zip in a text editor (Mac: press **Cmd + Shift + .** in Finder to show hidden files, then open it with TextEdit. Windows: open it with Notepad). Copy **all** of its text and paste it into the big box on GitHub.
4. Click **Commit changes** → **Commit changes**.
5. Do the same once more for a file named `.nojekyll`. Put a single space in it and commit. (It tells GitHub to serve the files as they are.)

### Step 5 – Turn on the website
1. In your repo, click **Settings** (top) → **Pages** (left menu).
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: **main**, folder: **/(root)** → **Save**.
4. Wait 1–2 minutes and refresh. A box appears: *"Your site is live at https://USERNAME.github.io/nordlys/"*. Open it – you should see the sample company **Demo AB**.

### Step 6 – Run the price robot the first time
1. Click the **Actions** tab. If GitHub asks, click the green button to enable workflows.
2. Click **Update prices** (left) → **Run workflow** → **Run workflow**.
3. After about a minute it gets a ✅. Reload your site – Atlas Copco A now has a price chart.

From now on it runs by itself every weekday at 18:15 Swedish winter time (19:15 in summer).

---

## PART B – Add your own companies

1. In your repo, open `data/companies.json` and click the ✏️ **pencil** (Edit).
2. Copy a whole block from `{` to `}` and paste it after the last one. **Put a comma between blocks** – a missing comma is the #1 mistake.
3. Fill in the fields:

| Field | Example | Notes |
|---|---|---|
| `id` | `"VOLV-B"` | Short name used in the web address and folder name. No spaces. |
| `name` | `"Volvo B"` | Shown on the site |
| `yahoo` | `"VOLV-B.ST"` | The Yahoo Finance symbol. Search the company on finance.yahoo.com. Stockholm ends in **.ST**, Copenhagen **.CO**, Oslo **.OL**, Helsinki **.HE** |
| `exchange` | `"Nasdaq Stockholm"` | |
| `country` | `"SE"` | SE, DK, NO, FI or IS |
| `currency` | `"SEK"` | The currency the share trades in |
| `benchmark` | `"^OMX"` | Index to compare with. Sweden: `^OMX` (OMXS30). For other countries, look up the index symbol on Yahoo Finance first and paste it here. |
| `benchmark_name` | `"OMXS30"` | Shown on the site |
| `sector`, `industry`, `founded`, `employees`, `headquarters`, `mission`, `tags` | | Fill in from the company's annual report or website. Leave `""`, `null` or `[]` if you don't know – **don't guess**. |
| `ir_url` | `"https://…"` | The company's investor relations page. It is also given to the AI, which helps it find the right reports. |

4. Click **Commit changes**.
5. Run the price robot again (Part A, Step 6) or wait until the evening.

---

## PART C – Run an analysis (your routine)

**Do them in this order:** 1 Phase first → then 2, 3, 4, 6, 8 in any order → then 5 Key Metrics and 7 Valuation (they need the phase).

For each tab:
1. Open the company on your site and click the tab.
2. Click **📋 Copy prompt**. The company name, ticker, IR page, today's date (and the phase for 5 and 7) are added automatically at the bottom.
3. Open **claude.ai**, start a **new chat**, make sure **web search** is on, paste and send.
4. When the answer is finished, click the **copy** icon under it.
5. Back on your site, click **➕ Add on GitHub** (or **✏️ Update on GitHub** if it already exists). Paste the answer into the big box → **Commit changes**.
6. Wait about a minute and reload. The tab now shows charts at the top and the full text below.

**Check the work (important):** open two of the source links in the answer and see that the numbers match. If something looks wrong, ask Claude in the same chat: *"Show me the exact page and table where you found X."* If it can't, delete that number.

### The data block
Every prompt ends with a small block of code that starts with ```json. That block is what the website turns into charts. **Always copy the whole answer, including that block.** If a tab says the data block is missing or can't be read, the copy was cut off – copy again.

### When to update
| When | Re-run |
|---|---|
| After every quarterly (interim) report | 1 Phase, 5 Key Metrics, 7 Valuation, 8 Price & Sentiment |
| After the annual report | All 8 |

Each tab shows how old its analysis is, and warns you after 120 days.

---

## PART D – Remove the sample company
When your first real company is done:
1. Edit `data/companies.json` and delete the whole `DEMO` block (and the comma after it).
2. Delete the folder `data/analyses/DEMO` (open each file → ⋯ → Delete file) and the files `data/prices/DEMO.json` and `data/prices/index_DEMO-INDEX.json`.

---

## What was changed in your prompts (and why)
1. **Nordic sources instead of US ones.** 10-K → annual report, 10-Q → interim report, SEC EDGAR → the company's IR page and press releases. IFRS words like *net sales* and *operating profit (EBIT)*. Amounts stay in SEK/DKK/NOK/EUR.
2. **One phase decision tree everywhere.** Prompt 1 now uses the same tree as Prompt 7 (margin −5% to +5% → Phase 3 first, dividends last). The old Prompt 1 put every dividend-paying company in Phase 5 – that's almost every large Swedish company – and could never reach Phase 3.
3. **Honest about missing data.** Analyst estimates and Morningstar ratings are often not public for Nordic companies, so the prompts must write "N/A" or "Not covered" instead of inventing them.
4. **A data block at the end** of every answer, so the website can draw charts.
5. **Price & Sentiment** compares with the local index (OMXS30, OMXC25, OMXH25, OBX) instead of the S&P 500, and points to Nordic sources such as Finansinspektionen's insider and short-position registers.

---

## Problems?
| Problem | Fix |
|---|---|
| Site shows "Could not read data/companies.json" | A comma or quote is missing in companies.json. Paste it into jsonlint.com to find the line. |
| Price robot has a red ❌ | Click it to read the log. "Yahoo returned no data" = wrong `yahoo` or `benchmark` symbol. "Permission denied" = Settings → Actions → General → Workflow permissions → **Read and write** → Save. |
| No **Add on GitHub** button | It only appears on the live site (`…github.io`), not when you open the files on your computer. If it points to the wrong place, fill in `config.js`. |
| Changes don't show | Wait 1–2 minutes, then reload (Mac: Cmd+Shift+R, Windows: Ctrl+F5). |

Price data: Yahoo Finance via the free `yfinance` library (unofficial, for personal use). Market cap from Yahoo can be wrong for companies with A and B shares – the Valuation tab calculates it from the annual report instead.
