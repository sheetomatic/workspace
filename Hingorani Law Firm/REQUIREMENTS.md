# Hingorani client requirements (from audio, screenshots, CSV — Jun 2026)

Sources: `Hingorani Law Firm/` folder — worksheet master CSV, screenshots, WhatsApp voice notes.

## 1. Master worksheet (`worksheet master` tab)

- **4,219 unique cases** (File No. + MCC No. key), **193 columns**, 8 sections.
- Row 0 = business rules; row 1 = headers.
- **Imported to production** `hingorani` org: 3,729 → **4,219** cases (20-Jun-26 file).

### Section owners (from CSV notes row)

| Section | Team |
|---------|------|
| Sec 1 Sales / intake | Field staff |
| Sec 2 Court | Shehnaz / Sham |
| Sec 3 Medical | Back office — Ammesha / Tanu |
| Sec 4 RTI / DL | Saquib |
| Sec 5 Investigation | Praveen / Saquib |
| Sec 6 Disbursement | Aayush / Babli |
| Sec 7 High Court | Shamshad / Parashar |

### Automation rules (from CSV notes)

- **30-day popup** if signing + filing exceeds 30 days.
- **15-day reminder** for “Called client” (Sec 3).
- **AI WhatsApp reminder** for written statement (Sec 2).
- **Alert if incentive demanded twice** (Sec 1).
- Many fields require **PDF upload** or **scan** before case can progress.

---

## 2. Daily views (from screenshots — now in app)

| Client sheet tab | App view | Status |
|------------------|----------|--------|
| `diary 13-JUN` | **Diary** | Exists |
| `statement 12-jun` | **Statement** | **Added** — PF/WS/EVI/STATEMENT stages |
| `vickyPF` / `PF pare` | **PF due** | **Added** — filter PARE / VICKY |
| `filed file` / READY | **New cases (BD)** | Exists |
| `AS due` | **AS due** | Exists |
| `odr+dep` | **Order + Deposits** | Exists |
| `worksheet master` | All cases + case detail | Exists |

**Statement vs Diary (audio 5.1):** Statement is **not** the same as diary — filter by **case stage** (STATEMENT, PF, WS, EVI, etc.), sorted by next date. Diary is all cases with a next date.

---

## 3. Follow Fatal FIR sheet (audio 1 + screenshot)

Separate **monthly follow-up** tracker for new fatalities:

- Columns: Date, Field staff, DOA, FIR date, Crime no., F/I, Thana, Route, Deceased name, Contact, Address.
- **Monthly tabs** (Jan–Jun 2026).
- **Categories to exclude from follow-up:**
  - **No insurance** — stop following.
  - **Unknown vehicle** not seized — low value.
  - **Lost** — client gave case elsewhere (may re-contact later).

**Not built yet** — needs a Follow Fatal module or Cases sub-view.

---

## 4. File cover forms (Form1 F / Form2 I)

Printed **HINGORANI LAW CHAMBER** cover with:

- Parties, court, MCC, case-related dates (DOA, DL, permit, policy…)
- Scan document checklist (plaint, discharge, WS dates, CC scan…)
- **Process log grid** (Date | Process × 6 columns)
- Advocates + party phone + Co. File No.

**Partially built** — File Cover wizard + print at `/app/cases/[id]/file-cover`.

---

## 5. Process diary (printed lists + audio 3)

- Printed diary sorted by **next date** with red-pen updates (done, EVI dates, WS due).
- Team marks completion on paper → need **quick mobile update** on case stage / remarks.
- Process diary panel exists on case detail; extend for bulk diary list edits.

---

## 6. Audio transcripts (Whisper — Hindi/Hinglish)

| File | Summary |
|------|---------|
| `1` | Follow Fatal monthly sheet; exclude no-insurance & unknown vehicle; “lost” cases may be called again later |
| `3 DIARY` | Court diary after CCS — daily hearing list workflow |
| `5.1` | Statement view = case **stage** filter, placed beside diary, not same as diary |
| `5` | (Poor audio — needs client re-record or review) |
| `6` | Main workbook columns � date stamps on master when WhatsApp scans done; blank = pending |
| `7` | **Key workflow audio (English):** WhatsApp group per file; contact + relation; call client every **30 days** with reminder; scan dates stamped on master (EF, AF, BL, BQ�); F=fatal, I=injury (medical bills); empty date columns = pending work in lists of 700+ cases |
| `9` | Re-transcribe if needed |

Full text in `Hingorani Law Firm/transcripts/`.

---

## 7. Recommended next build (after this sprint)

1. **Follow Fatal FIR** monthly module (Sec 1 pipeline).
2. **30-day signing/filing alert** popup on Sec 2 cases.
3. **Print/sort layouts** matching `FOR LIST SORT AND PRINT` (color rows, court-wise).
4. **Bulk diary update** from mobile (red-pen workflow).
5. Re-transcribe / clarify audio 5–9 with client.

---

## 8. `FOR LIST SORT AND PRINT` workbook (Google Sheet — Jun 2026)

**Sheet ID:** `1jQILoVJTCNhwouP6QfLvvX9oSvqOlsGb7jEeh8kaQyg`  
**Title:** FOR LIST SORT AND PRINT (23-jun-26)  
**Access:** CSV export works without login (link-shared). `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` is empty in Vercel env — API sync not available yet.

**This is NOT the worksheet master.** It has **53 operational list tabs** (dated snapshots for print/sort). There is **no `worksheet master` tab** and no 193-column master register.

The **worksheet master** remains on the older private sheet used by `import-csv.ts`:

| Purpose | Sheet ID | GID | Access |
|---------|----------|-----|--------|
| Master register (4,219 cases, 193 cols) | `1Rbow1wttTd0rIxzf_zo9qkKmO1lvFb3keSk1-P-HhKc` | `1228012786` | Login required — share with service account |
| Daily print lists (this workbook) | `1jQILoVJTCNhwouP6QfLvvX9oSvqOlsGb7jEeh8kaQyg` | (per tab name) | Public CSV export |

Local file `worksheet master (20-JUN-26) - work.csv` matches the **master** sheet (4,233 lines incl. notes row), not this print workbook.

### Tabs mapped to existing Sheetomatic views

| Sheet tab (23-Jun-26) | Rows | App view | Notes |
|-----------------------|------|----------|-------|
| `filed file 19-jun-26` | ~100 | **New cases (BD)** | READY / paper? / FILED queue; 14 cols (File No., F/I, DOA, Thana, Field…) |
| `dairy20jun fno.` | ~899 | **Diary** | Sorted by next date; Sec 2, F-No, Court, AMD & CC |
| `statmnt25jun` / `DONT DELETE statment 13-jun` | ~124 / ~151 | **Statement** | Case-stage filter + next date |
| `vickyPF 20-jun prev` / `PF pare 20jun` | ~288 / ~98 | **PF due** | Assignee-specific PF queues |
| `AS due 20-jun-26` / `AS due 1-apr` | ~166 / ~133 | **AS due** | Agreement due lists |
| `ord+dep21jun fno.amt` / `dep fno.20-jun` / `dep 20-jun` | ~394 / ~617 / ~597 | **Order + Deposits** | Amount-sorted deposit lists |
| `odr+dep SF 21-jun-26 0.` | ~538 | **Simple fracture (Abhishek)** | Header says “SIMPLE FRACTURE LIST FOR ABHISHEK” |
| *(derived from master)* | — | **Running** | No dedicated tab — filter `File Status = RUNNING` on master |

### Major sheet tabs with no app view yet

High Court (`high court 20-may`, `HC adv wise`, `HC kapil + nitin`, `Bajaj HC`, `HC calling`, `file appeal`), PDC (`PDC ct`, `PDC LA`, `pdc dr`), certified copy (`certi local`, `certi outside`), **Lost** (`Lost 8-MAR-26`, `om lost`), **Fee Due**, disbursement/voucher (`vou S-10`, `dep 50k`), WS awaited (`WS 28-may B`), EVI/argument (`EVI 13-jun`, `argu 20-jun`), AMD, WhatsApp group list (`saquib whatsapp`), account/cheque lists (`call pay`, `ord adv`, `ord com`), ISRA, Labour Court (`WC 3-JAN`), `lawyer list` (reference).

**Follow Fatal FIR** is still not in this workbook (separate monthly tracker per audio).

### Sync recommendation

- **Do not** point `hingorani` org `googleSheetId` at `1jQILo…` for `sync-hingorani-sheet.ts` — parser expects 193-column master CSV.
- Keep master sync on `1Rbow…` / gid `1228012786` (after sharing with service account) **or** continue `import-hingorani-local.ts` from the local CSV.
- Use the print workbook as the **spec for view filters, columns, and print layouts** — optionally add read-only tab export later (by tab name via `gviz/tq?sheet=…`).
