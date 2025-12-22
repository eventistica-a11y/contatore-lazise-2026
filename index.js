const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // 1 Apri pagina iscrizioni
        await page.goto('https://www.avaibooksports.com/inscripcion/lazise-love-run-2026/', { waitUntil: 'networkidle2' });

        // 2️ Clicca sul pulsante "ISCRIVITI SENZA CODICE PROMOZIONALE"
        const buttons = await page.$x("//button[contains(., 'ISCRIVITI')]");
        if(buttons.length >= 2){
            await buttons[1].click(); // il secondo pulsante sotto la scritta
        }

        // 3️ Inserisci numero tessera fittizio
        await page.waitForSelector('input[name="num_licencia"]', { timeout: 5000 });
        await page.type('input[name="num_licencia"]', '123456');

        // 4️ Clicca "OK, ISCRIVITI" (il pulsante sotto al campo tessera)
        const okButtons = await page.$x("//button[contains(., 'OK, ISCRIVITI')]");
        if(okButtons.length >= 1){
            await okButtons[0].click();
        }

        // 5️ Attendi che il contatore diventi visibile
        await page.waitForSelector('.numInsc', { timeout: 5000 });

        // 6️ Leggi il numero reale
        const iscrittiText = await page.$eval('.numInsc', el => el.textContent);
        // Estrarre il numero prima dello slash
        const match = iscrittiText.match(/(\d+)\s*\//);
        const iscritti = match ? parseInt(match[1]) : 0;

        res.json({ iscritti });

    } catch (error) {
        console.error(error);
        res.json({ errore: true, motivo: error.message });
    } finally {
        if(browser) await browser.close();
    }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
