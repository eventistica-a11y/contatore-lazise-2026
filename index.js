import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 10000;

// cache semplice 60s
let cache = { value: null, ts: 0 };

async function getIscritti() {
  const now = Date.now();
  if (cache.value && now - cache.ts < 60000) return cache.value;

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();

  await page.goto(
    "https://www.avaibooksports.com/inscripcion/lazise-love-run-2026/inscripcion_datos/",
    { waitUntil: "networkidle" }
  );

  // STEP 1: clic su ISCRIVITI SENZA CODICE PROMO
  await page.locator("text=ISCRIVITI SENZA CODICE PROMOZIONALE")
            .locator("..")
            .locator("text=ISCRIVITI")
            .click();

  // STEP 2: inserisci tessera
  await page.fill('input[name*="fidal"]', "123456");
  await page.locator("button", { hasText: "OK" }).first().click();

  // STEP 3: conferma dialog
  await page.keyboard.press("Enter");

  // attesa contatore
  const span = await page.waitForSelector(".numInsc", { timeout: 15000 });
  const text = await span.innerText();
  const match = text.match(/^(\d+)/);
  const iscritti = match ? parseInt(match[1], 10) : 0;

  await browser.close();

  cache = { value: iscritti, ts: now };
  return iscritti;
}

app.get("/", async (req, res) => {
  try {
    const iscritti = await getIscritti();
    res.json({ iscritti, aggiornato: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ errore: true, messaggio: e.message });
  }
});

app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
