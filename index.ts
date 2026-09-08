import puppeteer from "puppeteer";
import fs from "fs/promises"
import { platformRegistry } from "./platforms/registry";
import { Listing } from "./platforms/base";

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: yarn scrape <platform> <search-term> <limit>");
    console.log("Example: yarn scrape marktplaats tshirt 20");
    process.exit(1);
  }

  //name aangepast naar platformName
  const platformName = args[0]?.toLowerCase();
  const searchTerm = args[1];
  const limit = parseInt(args[2]);

  //check of requested platform is geregistreerd in map
  const PlatformClass = platformRegistry[platformName]

  //als requested platform niet in map bestaat, dan error geven
  if (!PlatformClass) {
    console.error(`Error: Platform "${platformName} is not supported"`);
    console.log(`Our available platforms are: Marktplaats, Asos and Mediamarkt`);
    process.exit(1)
  }

  //creert nieuwe platformInstance 
  const platformInstance = new PlatformClass();

  //check of platformInstance werkt door naam te printen (werkt)
  console.log(`Succesfully instantiated platform: ${platformInstance.name}`)

  if (isNaN(limit) || limit <= 0) {
    console.log("Limit must be a positive number");
    process.exit(1);
  }

  console.log(
    `Searching for "${searchTerm}" with limit ${limit} on ${platformInstance.name}`
  );

  // TODO: Implement scraping logic here

//Framework, managing

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });


  //chrome opens
  const searchPage = await browser.newPage()

  //pakt meer urls dan limit zodat er backups zijn voor geskippte lists
  const backupLimit = limit * 3;

  //get urls (use method scrapeSearchPage)
  const urls = await platformInstance.scrapeSearchPage(searchPage, searchTerm, backupLimit);
  console.log(`Found ${urls.length} to check `)
  await searchPage.close();

  //push lists with valid price in validListing
  let validListing: Listing[] = [];
  let urlIndex = 0;
  
  //while VALIDlisting kleiner is dan limit en urlIndex kleiner is dan urls length
  while (validListing.length < limit && urlIndex < urls.length) {
    const url = urls[urlIndex];
    urlIndex++

    const listingPage = await browser.newPage();
    try {
      await listingPage.goto(url, { waitUntil: "networkidle2"});
      //scrape items (use method scrapeItemPage)
      const listing = await platformInstance.scrapeItemPage(listingPage);
      
      //if listing is not null, push it to array validListing
      if (listing !== null) {
        validListing.push(listing)
        console.log(listing)
      } else {
        //else, skip listing
        await listingPage.close()
        continue;
      }

      await listingPage.close();

    } catch (error) {
      console.log(`Failed with scraping ${urlIndex - 1}: `, error);
    } 

  }

  console.log(`Succesfully scraped listings, total listings: ${validListing.length}`);

  //writing results to results.json
  try {
    
    const jsonString = JSON.stringify(validListing, null, 2);

    await fs.writeFile("results.json", jsonString, "utf-8");
    console.log("transfered data to results.json")

  } catch (fileError) {
    console.error(`Failed to write results to results.json: ${fileError}`)
  }

  await browser.close()
}

main().catch(console.error);
