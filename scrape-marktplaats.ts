import puppeteer from "puppeteer";

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto("https://www.marktplaats.nl/q/tandems/", { waitUntil: "networkidle2"});

  // Step 1. get all urls 
  const lists_with_a = 'li[class="hz-Listing hz-Listing--list-item"] a[class*="hz-Link hz-Link--block ListingListViewContentDesktop_hz-Listing-coverLink"]';
    
  const extract_href = (elements: HTMLAnchorElement[]) => elements.map(element => element.href);
  
  const urls: string[] = await page.$$eval(lists_with_a, extract_href) 

  //cleaned_urls (without empty string)
  const cleaned_urls = urls.filter((url) => url !== '' );
  
  //Step 2. Open new page for each listing 
  for (const cleaned_url of cleaned_urls) {
    try {
      const listingPage = await browser.newPage();

      await listingPage.goto(cleaned_url, {waitUntil: "networkidle2"});

      //Step 3. Scrape and log listing info           
      const title = await listingPage.$eval('[class="ListingHeader-module-title"]', (element) => element.textContent?.trim())
      const price = await listingPage.$eval('[class="ListingHeader-module-price"]', (element) => element.textContent?.trim());
      const url= listingPage.url();

      //if price contains a string: "bid"/"see description", skip listing
      const unclear_price = price.toLowerCase();
      if (unclear_price.includes('bieden') || unclear_price.includes('zie omschrijving')) {
        await listingPage.close();
        continue;
      }

      
      const listing_info: string[] = [title, price, url]
      console.log(listing_info.length)
      await listingPage.close();
    }
    catch (err) {
      console.error(`Error processing: ${cleaned_url}:`, err);
    }
  }


  await browser.close();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
