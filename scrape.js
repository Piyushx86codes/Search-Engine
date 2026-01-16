import puppeteer from "puppeteer";
import fsPromises from "fs/promises";


async function scrapeLeetcodeProblems() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = await browser.newPage();
  const customUA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36";

  await page.setUserAgent(customUA);

  await page.goto("https://leetcode.com/problemset/", {
    waitUntil: "domcontentloaded",
  });

  const problemSelector =
    "a.group.flex.flex-col.rounded-\\[8px\\].duration-300";

  let allProblems = [];
  let prevCount = 0;
  const target = 500;

  console.log("Scrolling to collect LeetCode problem URLs...");

  while (allProblems.length < target) {
    await page.evaluate((sel) => {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length) {
        nodes[nodes.length - 1].scrollIntoView({ block: "end" });
      }
    }, problemSelector);

    try {
      await page.waitForFunction(
        (sel, prev) => document.querySelectorAll(sel).length > prev,
        { timeout: 5000 },
        problemSelector,
        prevCount
      );
    } catch {
      console.log("Reached end of list.");
      break;
    }

    allProblems = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel)).map((el) => ({
        title:
          el.querySelector(".ellipsis")?.textContent
            ?.trim()
            .split(". ")[1] || "No Title",
        url: el.href,
      }));
    }, problemSelector);

    prevCount = allProblems.length;
    console.log(`Collected ${prevCount} problems...`);
  }

  const problemsWithDescription = [];
  const problemPage = await browser.newPage();

  console.log("Fetching LeetCode descriptions...");

  for (let i = 0; i < Math.min(target, allProblems.length); i++) {
    const { title, url } = allProblems[i];
    try {
      await problemPage.goto(url, { waitUntil: "domcontentloaded" });

      const descSelector = 'div[data-track-load="description_content"]';
      await problemPage.waitForSelector(descSelector, { timeout: 10000 });

      const description = await problemPage.evaluate((sel) => {
        const div = document.querySelector(sel);
        if (!div) return "No description found";

        return Array.from(div.querySelectorAll("p"))
          .map((p) => p.textContent.trim())
          .filter(Boolean)
          .join("\n");
      }, descSelector);

      problemsWithDescription.push({ title, url, description });
      console.log(`✔ LeetCode: ${title}`);
    } catch (err) {
      console.warn(`✖ Failed LeetCode: ${title}`);
    }
  }

  await fsPromises.mkdir("./problems", { recursive: true });
  await fsPromises.writeFile(
    "./problems/leetcode_problems.json",
    JSON.stringify(problemsWithDescription, null, 2)
  );

  await browser.close();
}


async function scrapeCodeforces() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = await browser.newPage();
  const customUA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36";

  await page.setUserAgent(customUA);

  const problems = [];
  const pagesToScrape = 1;

  for (let pageNum = 1; pageNum <= pagesToScrape; pageNum++) {
    const url = `https://codeforces.com/problemset/page/${pageNum}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const linkSelector =
      "table.problems tr td:nth-of-type(2) > div:first-of-type > a";

    const links = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel)).map((a) => a.href);
    }, linkSelector);

    for (let i = 0; i < Math.min(5, links.length); i++) {
      const link = links[i];

      try {
        await page.goto(link, { waitUntil: "domcontentloaded" });

        const { title, description } = await page.evaluate(() => {
          const title =
            document
              .querySelector(".problem-statement .title")
              ?.textContent.trim()
              .split(". ")[1] || "No title";

          const description =
            document
              .querySelector(".problem-statement > div:nth-of-type(2)")
              ?.textContent.trim() || "No description";

          return { title, description };
        });

        problems.push({ title, url: link, description });
        console.log(`✔ Codeforces: ${title}`);
      } catch (err) {
        console.warn(`✖ Failed Codeforces: ${link}`);
      }
    }
  }

  await fsPromises.mkdir("./problems", { recursive: true });
  await fsPromises.writeFile(
    "./problems/codeforces_problems.json",
    JSON.stringify(problems, null, 2)
  );

  await browser.close();
}


scrapeLeetcodeProblems();
scrapeCodeforces();


