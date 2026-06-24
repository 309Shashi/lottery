# Clifton Mini Mart Lottery Worksheet

A mobile-first daily scratch-off lottery worksheet for Clifton Mini Mart. Employees enter ticket serial numbers, the app calculates scratch-off sales, and it produces a printable one-page PDF report.

## Daily use

1. Open the worksheet on the store phone or tablet.
2. Confirm the date and day at the top.
3. Enter the opening and closing number for each ticket book.
4. Enter Instances, Sales, Cashes, and Pull tabs in the cash section.
5. Review the running calculation box at the bottom.
6. Tap **Export as one-page PDF** and choose **Save as PDF** from the browser print screen.

## Ticket prices

| Tickets | Price | Number range |
| --- | ---: | --- |
| 1-3 | $1 | 0-199 |
| 4-11 | $2 | 0-99 |
| 12-19 | $5 | 0-49 |
| 20-29 | $10 | 0-49 |
| 30-36 | $20 | 0-29 |
| 37-40 | $30 | 0-29 |
| 41 | $50 | 0-29 |
| 42 | $10 | 0-29 |

Use **Settings** at the top of the page to change ticket names or prices.

## Counting rules

The closing number is the first ticket still remaining, so it is not counted as sold.

| Opening | Closing | Result |
| --- | --- | --- |
| `10` | `15` | 5 sold: 10 through 14 |
| `197` | `-` | 3 sold in a 0-199 book: 197, 198, 199 |
| `-` | `5` | 5 sold from a new book: 0 through 4 |
| `-` | `-` | 0 sold; no tickets in the book all day |

## Final calculation

`Scratch off sales - (Instances 1 + Instances 2) + (Sales 1 + Sales 2) - (Cashes 1 + Cashes 2) - Pull tabs`

The worksheet shows every running balance in its final calculation box.

## Data and QR code

The worksheet stores the current work locally in the browser. The QR code generated from Settings adds a fresh-start flag, so scanning the QR code clears old entries before a new worksheet begins. The Reset button clears today’s entered values while keeping ticket prices.

To make the QR code usable, publish this repository to a static host first, then paste the public `https://` address into Settings.

## Run locally

Open `index.html` in any modern browser. No build step or server is required.
