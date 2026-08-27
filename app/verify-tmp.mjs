import { chromium } from 'playwright';

const SCRATCH = '/private/tmp/claude-501/-Users-macbookair-Documents-Claude-Projects-Collabnb-Website/546401b1-aed9-48c3-9d14-e20718bb7f64/scratchpad';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));

function clearErrors() { errors.length = 0; }
async function shot(name) { await page.screenshot({ path: `${SCRATCH}/${name}.png`, fullPage: false }); }
function report(label) { console.log(`\n--- ${label} ---`); console.log('errors:', errors.length ? errors : 'none'); }

await page.goto('http://localhost:5174/host/proposals', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(2000);
clearErrors();
await shot('01-overview');
report('Overview tab loaded');

// Check stat card labels present
const bodyText = await page.locator('body').innerText();
console.log('Has "Active Collabs":', bodyText.includes('Active Collabs'));
console.log('Has "New Applications":', bodyText.includes('New Applications'));
console.log('Has "Unread Messages":', bodyText.includes('Unread Messages'));
console.log('Has "Upcoming Stays":', bodyText.includes('Upcoming Stays'));
console.log('Has "Upcoming" section:', bodyText.includes('Upcoming'));

// Click Calendar nav
clearErrors();
const calNav = page.getByText('Calendar', { exact: true }).first();
await calNav.click({ timeout: 5000 }).catch(e => console.log('calendar click failed:', e.message));
await page.waitForTimeout(1500);
await shot('02-calendar-tab');
report('Calendar tab');

// Click Activity nav
clearErrors();
const actNav = page.getByText('Activity', { exact: true }).first();
await actNav.click({ timeout: 5000 }).catch(e => console.log('activity click failed:', e.message));
await page.waitForTimeout(2000);
await shot('03-activity-board');
report('Activity/board tab');
const boardText = await page.locator('body').innerText();
console.log('Board has "Back to Dashboard":', boardText.includes('Back to Dashboard'));
console.log('Board has Pending/Accepted/Adjustments/Uploaded/Closed/Archived:', ['Pending','Accepted','Adjustments','Uploaded','Closed','Archived'].map(s => boardText.includes(s)));
console.log('Board has sidebar (Collabnb logo text)?', boardText.includes('Collabnb'));

await browser.close();
