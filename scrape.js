import puppeteer from 'puppeteer';

async function scrapeLeetcodeProblems(){
    const browser = await puppeteer.launch({
        headless:false,
        defaultViewport:null,
        args:["--disable-blink-features=AutomationControlled"],
    });

    const page = await browser.newPage();
    const customUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36';
 
    // Set custom user agent
    await page.setUserAgent(customUA);
    await page.goto("https://leetcode.com/problemset/",{
        waitUntil:"domcontentloaded",
    });

    const problemselector = "a.group.flex.flex-col.rounded-\\[8px\\].duration-300";

    let allProblems =[];
    let prevCount = 0;
    const target = 500;


    while(allProblems.length < target ){
        await page.evaluate((sel)=>{
            const currentProblemsonPage = document.querySelectorAll(sel);
            if(currentProblemsonPage.length){
                currentProblemsonPage[currentProblemsonPage.length - 1].scrollIntoView({
                    behavior:"smooth",
                    block:"end",
                })
            }
        },problemselector);


        await page.waitForFunction((sel,prev)=> document.querySelectorAll(sel).length > prev , 
        {},
        problemselector,
        prevCount
    );
       allProblems =  await page.evaluate(()=>{
        const nodes = Array.from(document.querySelectorAll(sel));
        return nodes.map((el)=>({
            title:el.querySelector(".ellipsis.line-clamp-1")?.textContent.trim().split(". ")[1],url:el.href
        }));
       },problemselector);

       prevCount = allProblems.length;
    }

    const problemsWithdescription = [];
    for(let i = 0;i< 9;i++){
      const {title , url} = allProblems[i];

      const problemPage = await browser.newPage();
      try {
        await problemPage.goto(url);
        let description = await  problemPage.evaluate(()=>{
            const descriptionDiv = document.querySelector(
                'div.elfjs[data-track-load ="description_content"]'
            );
            const paragraphs = descriptionDiv.querySelectorAll("p");

            let collectDescription = [];
            for(const p of paragraphs){
                if(p.innerHTML.trim() === "&nbsp;"){
                    break;
                }
                collectDescription.push(p.innerHTML.trim());
            }
            return collectDescription.filter((text)=>text !== "").join("");
        });
        problemsWithdescription.push({title,url,description});
    
      } catch (error) {
          console.error(`Error fecthing description for ${title} (${url})`,error);
      }finally{
        await problemPage.close();
      }

    }


}

scrapeLeetcodeProblems();