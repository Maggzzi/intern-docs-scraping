import { Page } from "puppeteer";
import { Listing, Platform } from "./base";

export class Mediamarkt implements Platform {
    name: string = "mediamarkt";

    scrapeSearchPage(page: Page, keyword: string, limit: number): Promise<string[]> {
        throw new Error("Method 'scrapeSearchPage' not implemented for Mediamarkt")
    }

    scrapeItemPage(page: Page): Promise<Listing> {
        throw new Error("Method 'scrapeItemPage' not implemented for Mediamarkt")
    }
}