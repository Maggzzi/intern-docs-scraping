import { Page } from "puppeteer";
import { Listing, Platform } from "./base";

export class Marktplaats implements Platform {
  name: string = "marktplaats";

  async scrapeSearchPage(page: Page, keyword: string, limit: number): Promise<string[]> {
    const allUrls: string[] = [];
    let currentPage = 1;
    const targetUrlCount = limit;


    console.log(`Starting pagination to collect at least ${targetUrlCount} urls.`);
    
    //keep looping till all urls are less than actuale limit
    while (allUrls.length < targetUrlCount) {
      const pageUrl = `https://www.marktplaats.nl/q/${keyword}/p/${currentPage}/`;
      console.log(`Fetching search page: ${currentPage}, url: ${pageUrl}`);


      try {
        await page.goto(pageUrl);


        const lists_with_a = 'li[class="hz-Listing hz-Listing--list-item"] a[class*="hz-Link hz-Link--block ListingListViewContentDesktop_hz-Listing-coverLink"]';
        //wait untill lists are loaded
        await page.waitForSelector(lists_with_a, { timeout: 10000})

        //get all urls 
        const urls: string[] = await page.$$eval(lists_with_a, (elements) => 
          elements.map(element => (element as HTMLAnchorElement).href)
        );

        //all urls checked if they are empty or not (empty string)
        const cleaned_urls = urls.filter((url) => url !== '' );
  
        //if all urls in cleaned_urls is empty, stop pagination
        if (cleaned_urls.length === 0) {
          console.log(`No more listings found or selectors failed. Stopping pagination.`);
          break; 
        }

        //if each url is unique AND there are less quantity urls than limit, push to allUrls list.
        for (const url of cleaned_urls) {

          //remove tracking token to avoid duplicate urls 
          const clean_url = url.split('?')[0];

          if (allUrls.includes(clean_url)) {
            continue;
          }

          if (allUrls.length < targetUrlCount) {
            allUrls.push(clean_url)
          } else {
            break;
          }

        }

        console.log(`Collected ${allUrls.length} total urls so far.`);
        console.log(`----------------------------------------------`)
        currentPage++;

        //added for safety so that it stops from infinite looping
        if (currentPage > 10) {
          console.log("Reached safety pagination limit (10 pages).");
          break;
        }

      } catch (error) {
        console.error(`Error fetching page ${currentPage}:`, error);
        break;
      }
    }

    //allUrls get saved instead of only existing within loop
    return allUrls;
  }

  async scrapeItemPage(page: Page): Promise<Listing | null> {
    try {
      
      //Get title, price and url
      const title = await page.$eval('[class*="ListingHeader-module-title"]', (element) => element.textContent?.trim());
      const price_string = await page.$eval('[class*="ListingHeader-module-price"]', (element) => element.textContent?.trim());
      const url = page.url();

      //if price_string is falsy(undefined/empty string) or price DOESN't include euro. listing gets skipped
      if (!price_string || !price_string.includes("€")) {
        return null;
      }
      
      //cleans price (removes everything except numbers + kommas) and replaces komma with dot
      const clean_string = price_string.replace(/[^\d,]/g, "").replace(",", ".");
      const price = parseFloat(clean_string);

      //if price isNaN, listing gets skipped
      if (isNaN(price)) {
        return null;
      }
      
      //return Listing (promise)
      return {
        title: title,
        price: price,
        url: url
      };
    } catch {
      //returns null to skip pages if they time out/fail to parse
      return null;
    }
  }
}
