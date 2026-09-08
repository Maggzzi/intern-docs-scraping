import puppeteer from "puppeteer";
import { Page } from "puppeteer";

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  //IS ACTUALLY SCRAPE-MEDIAMARKT (scraper mediamarkt without abstraction)
  //Get pageUrl
  const pageUrl = `https://www.mediamarkt.nl/nl/search.html`
  await page.goto(pageUrl, { waitUntil: "networkidle2"} )

  //Click on cookieButton 
  const AcceptCookieButton = '[id="pwa-consent-layer-accept-all-button"]';
  await page.waitForSelector(AcceptCookieButton);
  await page.click(AcceptCookieButton)


  //Click on searchButton
  const searchButton = 'input[id="search-form"]'
  await page.waitForSelector(searchButton);
  await page.click(searchButton);
  await page.type(searchButton, 'Ipad 10');
  await page.keyboard.press('Enter');

  //Wait for navigation
  await page.waitForNavigation( {waitUntil: "domcontentloaded"} )

  //Selectors for listlinks and showMoreProducts
  const ListLinkSelector = 'a[class="sc-66506eb5-1 cevLqa sc-90ce9e66-1 hZAwcG"]';
  const showMoreProductsButton = '[data-test="mms-search-srp-loadmore"]';

  //keep track of all urls to avoid duplicates (mediamarkt doesnt have pagination but a show more button, to refrain from getting the same urls, make allScrapedUrls a Set => only unique urls allowed)
  let allScrapedUrls = new Set<string>;
  let hasMorePages = true; // on and off switch, looks for the show more button, and if it dissapears, there arent more pages (stops scraping)
  let maxPagesToScrape = 4; //Safety limit so it doenst loop forever (eats rams up and might get ip banned from mediamarkt)
  let pagesScraped = 0; //when page scrapes a batch (12) listings, it scraped one page, value goes up everytime it gets a batch of listings


  //if there are more products to load and pagesScraped is less than Maximum pages to scrape, scrape items
  while (hasMorePages && pagesScraped < maxPagesToScrape) {
    
    //scroll down to lazy-load listings
    await autoScroll(page);
    await page.waitForSelector(ListLinkSelector, { timeout: 10000 });

    //Get all urls
    const currentUrls: string[] = await page.$$eval(ListLinkSelector, (elements) => elements.map(element => element.href))
    console.log(currentUrls)

    //Filter out urls we already scraped in previous iterations
    const newUrls = currentUrls.filter(url => !allScrapedUrls.has(url));
    console.log(`Found ${newUrls.length} new products to scrape.`)


    //Open new page for each listing
    for (const urlOfListing of newUrls) { //moet urlOfListing noemen ipc url omdat const url daarmee botst (denken dat beide url zijn)
      
      try {
        const listingPage = await browser.newPage();
        await listingPage.goto(urlOfListing, {waitUntil: "networkidle2" })

        //Step 3. Scrape and log listing info
        const title = await listingPage.$eval('h1[class="mms-ui-kMHEba mms-ui-ezkBTa mms-ui-gRFqDK mms-ui-cAsDZa mms-ui-gGRRlH"]', (e) => e.textContent)
        const price = await listingPage.$eval('span[data-test="branded-price-whole-value"]', (e) => e.textContent)
        const url = listingPage.url();

        console.log({title, price, url});
        await listingPage.close();
        allScrapedUrls.add(urlOfListing)

      } catch (err) {
        console.error(`Error processing: ${urlOfListing}:, ${err}`)
      }
    }

    pagesScraped++

    //check if showMoreProductsButton exists/is visible
    const loadMoreButton = await page.$(showMoreProductsButton);
    if (loadMoreButton) {
      console.log(`Clicking 'Show more' button to get more listings`)
      console.log(`How many times did we use 'show more button: ${pagesScraped}`)
      await page.click(showMoreProductsButton)

      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
    } else {
      //this wont get commented, so hasMorePages never is false
      console.log(`No more 'Show more' button found, finished scraping'`);
      hasMorePages = false
    }
  }

  console.log(`Total unique listings scraped: ${allScrapedUrls.size}`)
  await browser.close();
}


//autoScroll function for everything to get loaded (mediamarkt uses lazyloading, so need to scroll )
async function autoScroll(page: Page) {
  await page.evaluate( async() => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 150; //Scroll 150px at a time
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance


        //stop scrolling when reach bottom of the page
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve()
        }
      }, 100)
    })
  })
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
