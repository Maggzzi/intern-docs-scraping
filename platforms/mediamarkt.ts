import { Page } from "puppeteer";
import { Listing, Platform } from "./base";

export class Mediamarkt implements Platform {
    name: string = "mediamarkt";

    async scrapeSearchPage(page: Page, keyword: string, limit: number): Promise<string[]> {
        let allUrls: string [] = []
        //currentPage = pagesScraped
        let pagesScraped = 0; //when page scrapes a batch (12) listings, it scraped one page, value goes up everytime it gets a batch of listings
        const targetUrlCount = limit; 
        
        //Get pageUrl
        const pageUrl = `https://www.mediamarkt.nl/nl/search.html`
        await page.goto(pageUrl, { waitUntil: "domcontentloaded"} )

        //Click on cookieButton 
        const AcceptCookieButton = '[id="pwa-consent-layer-accept-all-button"]';
        await page.waitForSelector(AcceptCookieButton);
        await page.click(AcceptCookieButton)

        //Click on searchButton
        const searchButton = 'input[id="search-form"]'
        await page.waitForSelector(searchButton);
        await page.click(searchButton);
        await page.type(searchButton, keyword);
        await page.keyboard.press('Enter');
                
        //Wait for navigation
        await page.waitForNavigation( {waitUntil: "domcontentloaded"} )

        //Selectors for listlinks and showMoreProducts
        const ListLinkSelector = 'a[class="sc-66506eb5-1 cevLqa sc-90ce9e66-1 hZAwcG"]';
        const showMoreProductsButton = '[data-test="mms-search-srp-loadmore"]';

        //keep looping till our urls hit our target (limit)
        while(allUrls.length < targetUrlCount) {

            //scroll down to lazy-load listings
            await this.autoScroll(page);
            await page.waitForSelector(ListLinkSelector, { timeout: 10000 });

            try {
                //Get all urls
                const currentUrls: string[] = await page.$$eval(ListLinkSelector, 
                    (elements) => elements.map(element => element.href)
                );     

                //if each url is unique, push to allUrls and all urls hit our target limit
                for (const url of currentUrls) {
                    if (!allUrls.includes(url) && allUrls.length < targetUrlCount) {
                        allUrls.push(url);
                    }
                }
                
                console.log(`Collected ${allUrls.length} total urls so far.`)
                console.log(`----------------------------------------------`)
                pagesScraped++

                //safety limit 
                if(pagesScraped > 10 ) {
                    console.log("Reached safety pagination limit (10 pages).");
                    break;
                }

                //check if showMoreProductsButton exists/is visible
                const loadMoreButton = await page.$(showMoreProductsButton);
                if (loadMoreButton) {
                    console.log(`Clicking 'Show more' button to get more listings`)
                    await page.click(showMoreProductsButton)

                    // Allow server data payload transmission to finish loading DOM updates
                    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

                } else {

                    //this wont get commented, so hasMorePages never is false
                    console.log(`No more 'Show more' button found, finished scraping'`);
                    break;
                }

            } catch (error) {
                console.error(`Error fetching page ${pagesScraped}:`, error);
                break;
            }
            
        }
        
    return allUrls
       
    }

    async scrapeItemPage(page: Page): Promise<Listing | null> {

        try {
            //Scrape and log listing info
            const title = await page.$eval('h1[class="mms-ui-kMHEba mms-ui-ezkBTa mms-ui-gRFqDK mms-ui-cAsDZa mms-ui-gGRRlH"]', (e) => e.textContent)
            const price_string = await page.$eval('span[data-test="branded-price-whole-value"]', (e) => e.textContent)
            const url = page.url();


            //cleans price (removes everything except numbers + kommas) and replaces komma with dot
            const clean_string = price_string.replace(/[^\d,]/g, "").replace(",", ".");
            const price = parseFloat(clean_string);

            //if price isNaN, listing gets skipped
            if (isNaN(price)) {
                return null;
            }

            return {
                title: title,
                price: price,
                url: url
            }

        } catch {
            //returns null to skip pages if they time out/fail to parse
            return null;
        }
        
    }

    //autoScroll function for everything to get loaded (mediamarkt uses lazyloading, so need to scroll )
    // Helper utility attached to the class layout natively
    private async autoScroll(page: Page) {
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

}