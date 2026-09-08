import { Page } from "puppeteer";
import { Listing, Platform } from "./base";

export class Asos implements Platform {
    name: string = "asos"

    async scrapeSearchPage(page: Page, keyword: string, limit: number): Promise<string[]> {
        const allUrls: string[] = [];
        let currentPage = 1;
        const targetUrlCount = limit;
        

        console.log(`Starting pagination to collect at least ${targetUrlCount} urls.`)

        //while all urls are less than targetUrlCount
        while (allUrls.length < targetUrlCount){
            
            //getting page url
            const pageUrl = `https://www.asos.com/search/?q=${keyword}&page=${currentPage}`;
            console.log(`Fetching seach page: ${currentPage}, url: ${pageUrl}`)

            try {
                await page.goto(pageUrl);

                //get ListLink selector and wait
                const ATagOfList = 'a[class="productLink_KM4PI"]';
                await page.waitForSelector(ATagOfList)

                //get all urls
                const urls: string[] = await page.$$eval(ATagOfList, (elements) => elements.map(element => (element as HTMLAnchorElement).href))
                
                //if each url isnt in allUrls already and is less than actual limit, push into allUrls array
                for (const url of urls) {
                    if (!allUrls.includes(url) && allUrls.length < targetUrlCount) {
                        allUrls.push(url)
    
                    }
                }

                console.log(`Collected ${allUrls.length} total urls so far.`)
                console.log(`----------------------------------------------`)
                //increase page to go to next one
                currentPage++;


                if (currentPage > 10) {
                    console.log("Reached safety pagination limit (10 pages)")
                    break;
                }

            } catch(error){
                console.error(`Had trouble with fetching page: ${currentPage}: `, error);
            }

        }

        return allUrls
    }

    async scrapeItemPage(page: Page): Promise<Listing | null > {
        
        try {
            const title = await page.$eval('[class="jcdpl"]', (element) => element.textContent?.trim());
            //only get first price tag (there are two), hint, first one is 34.00
            const price_string = await page.$eval('[class="ky6t2"]', (element) => element.textContent?.trim());
            const url = page.url();

            //cleaning price (remove everything except numbers + kommas and replace komma with dot)
            const clean_string = price_string.replace(/[^\d.]/g, "");
            const price = parseFloat(clean_string);

            if (isNaN(price)) {
                return null
            }

            return {
                title: title,
                price: price,
                url: url
            };

        } catch {
            return null;
        }

    }
}