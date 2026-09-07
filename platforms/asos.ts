import { Page } from "puppeteer";
import { Listing, Platform } from "./base";

export class Asos implements Platform {
    name: string = "asos"

    scrapeSearchPage(page: Page, keyword: string, limit: number): Promise<string[]> {
        throw new Error("Method 'scrapeSearchPage' not implemented for Asos")
    }

    scrapeItemPage(page: Page): Promise<Listing> {
        throw new Error("Method 'scrapeItemPage' not implemented for Asos")
    }
}