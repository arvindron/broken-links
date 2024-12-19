import axios from "axios";
import * as XLSX from "xlsx";
import { load } from "cheerio";

export const POST = async (req) => {
  try {
    const body = await req.json();
    const file = body.file;

    if (!file) {
      return new Response(JSON.stringify({ error: "Excel file is required" }), {
        status: 400,
      });
    }

    // Parse the Excel file
    const workbook = XLSX.read(file, { type: "base64" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Extract URLs
    const urls = rows.map((row) => row.URL);

    // Function to fetch and parse links
    const fetchLinks = async (url) => {
      try {
        const response = await axios.get(url, { timeout: 10000 });
        const $ = load(response.data); // Cheerio usage
        const links = [];
        $("a").each((_, element) => {
          const href = $(element).attr("href");
          if (href && href.startsWith("http")) {
            links.push(href);
          }
        });
        return { url, links, status: response.status };
      } catch (error) {
        return {
          url,
          error: error.message,
          status: error.response ? error.response.status : "No Response",
        };
      }
    };

    // Process all URLs
    const results = await Promise.all(urls.map((url) => fetchLinks(url)));

    const checkBrokenLinks = async (links) => {
      const brokenLinks = [];
      await Promise.all(
        links.map(async (link) => {
          try {
            const response = await axios.head(link, { timeout: 5000, maxRedirects: 0 });
            if (response.status === 301 || response.status === 302) {
              brokenLinks.push({
                link,
                status: response.status,
                message: "Redirecting to a different URL",
                location: response.headers.location, // Capture the redirection target
              });
            } else if (response.status >= 400) {
              brokenLinks.push({ link, status: response.status, message: "Broken link" });
            }
          } catch (error) {
            if (error.response && error.response.status === 301) {
              brokenLinks.push({
                link,
                status: error.response.status,
                message: "Redirect detected",
                location: error.response.headers.location, // Redirect target
              });
            } else {
              brokenLinks.push({
                link,
                status: error.response ? error.response.status : "No Response",
                message: error.message,
              });
            }
          }
        })
      );
      return brokenLinks;
    };
    

    // Compile results
    const finalResults = [];
    for (const result of results) {
      if (result.error) {
        finalResults.push({
          URL: result.url,
          Error: result.error,
          Status: result.status,
        });
      } else {
        const brokenLinks = await checkBrokenLinks(result.links);
        if (brokenLinks.length === 0) {
          finalResults.push({
            URL: result.url,
            Status: result.status,
            BrokenLink: "None",
          });
        } else {
          for (const broken of brokenLinks) {
            finalResults.push({
              URL: result.url,
              BrokenLink: broken.link,
              Status: broken.status,
              Error: broken.message || "Broken Link Detected",
              RedirectTo: broken.location || null, // Include the redirect target
            });
          }
        }
      }
    }


    const newWorkbook = XLSX.utils.book_new();
    const newSheet = XLSX.utils.json_to_sheet(finalResults);
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Broken Links");
    const excelFile = XLSX.write(newWorkbook, { type: "base64" });    

    return new Response(
      JSON.stringify({ 
        results: finalResults, 
        excelFile 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
};
