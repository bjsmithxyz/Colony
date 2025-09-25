const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
  const url = process.env.URL || 'http://127.0.0.1:8000/';
  console.log('Connecting to', url);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // wait for window.simulation to be available
    await page.waitForFunction(() => !!window.simulation, { timeout: 20000 });
    console.log('Simulation instance found');

    // call resetSimulation(true) and observe no exceptions
    await page.evaluate(() => {
      try {
        if (window.resetSimulation) window.resetSimulation(true);
      } catch (e) { console.error('resetSimulation call failed', e); }
    });

    // wait a moment for any logs
    await page.waitForTimeout(1500);

    // save captured console logs
    fs.writeFileSync('smoke-test-logs.json', JSON.stringify(logs, null, 2));
    console.log('Captured', logs.length, 'console messages; saved to smoke-test-logs.json');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(2);
});
