import express from "express";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 10000;

// cache semplice 60s
let cache = {
  value: null,
  timestamp: 0
};

async function getIscritti() {
  const now = Date.now();
  if (cache.value && now - cache.timestamp < 60000) {
    return cache.value;
  }

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: process.env.CHROME_PATH || "/usr/bin/chromium-browser",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage"
  ]
});


  const page = await browser.newPage();
  await page.goto(
    "https://www.avaibooksports.com/inscripcion/lazise-love-run-2026/inscripcion_datos/",
    { waitUntil: "networkidle2", timeout: 60000 }
  );

  // STEP 1: clic su ISCRIVITI SENZA CODICE PROMO
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button, a")];
    const target = buttons.find(b =>
      b.innerText.includes("ISCRIVITI") &&
      b.closest("div")?.innerText.includes("SENZA CODICE")
    );
    target?.click();
  });

  await page.waitForTimeout(2000);

  // STEP 2: inserisci tessera
  await page.type('input[name*="fidal"]', "123456");
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    const ok = btns.find(b => b.innerText.includes("OK"));
    ok?.click();
  });

  // STEP 3: conferma dialog
  await page.waitForTimeout(1500);
  await page.keyboard.press("Enter");

  // attesa contatore
  await page.waitForSelector(".numInsc", { timeout: 15000 });

  const iscritti = await page.evaluate(() => {
    const span = document.querySelector(".numInsc");
    if (!span) return 0;
    const match = span.innerText.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  });

  await browser.close();

  cache = {
    value: iscritti,
    timestamp: now
  };

  return iscritti;
}

app.get("/", async (req, res) => {
  try {
    const iscritti = await getIscritti();
    res.json({
      iscritti,
      aggiornato: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({
      errore: true,
      messaggio: e.message
    });
  }
});

app.listen(PORT, () => {
  console.log("Server avviato sulla porta", PORT);
});

