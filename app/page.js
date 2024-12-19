"use client";

import { useState } from "react";

export default function BrokenLinkChecker() {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [excelFile, setExcelFile] = useState(null); // Separate state for the Excel file
  const [loading, setLoading] = useState(false);

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Upload the file and check for broken links
  const checkBrokenLinks = async () => {
    if (!file) {
      alert("Please upload an Excel file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64File = reader.result.split(",")[1];

      setLoading(true);

      try {
        const response = await fetch("/api/check-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64File }),
        });

        if (!response.ok) {
          throw new Error("Failed to process the file");
        }

        const data = await response.json();
        setResults(data.results);
        setExcelFile(data.excelFile); // Store the Excel file
      } catch (error) {
        console.error("Error checking links:", error);
        alert("An error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  // Download the results as an Excel file
  const downloadResults = () => {
    if (!excelFile);
     // Get the current date and time
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10); // Format: YYYY-MM-DD
    const formattedTime = now.toTimeString().slice(0, 8).replace(/:/g, "-"); // Format: HH-MM-SS
    const fileName = `broken_links_${formattedDate}_${formattedTime}.xlsx`;
    const link = document.createElement("a");
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelFile}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearAll = () => {
    setFile(null);
    setResults(null);
    setExcelFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Broken Link Checker</h1>

      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
        className="mb-4 p-2 border"
      />

      <button
        onClick={checkBrokenLinks}
        className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        disabled={loading}
      >
        {loading ? "Checking..." : "Check Links"}
      </button>

      <button
        onClick={downloadResults}
        className="bg-green-500 text-white px-4 py-2 rounded  mr-2"
        disabled={!results}
      >
        Download Results
      </button>

      <button
        onClick={clearAll}
        className="bg-red-500 text-white px-4 py-2 rounded"
      >
        Clear
      </button>

      {loading && <p className="mt-4 text-blue-600">Processing... Please wait.</p>}

      {results && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Results</h2>
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">URL</th>
                <th className="border border-gray-300 px-4 py-2">Broken Link</th>
                <th className="border border-gray-300 px-4 py-2">Status</th>
                <th className="border border-gray-300 px-4 py-2">Error</th>
                <th className="border border-gray-300 px-4 py-2">Redirect To</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">{result.URL}</td>
                  <td className="border border-gray-300 px-4 py-2">{result.BrokenLink || "None"}</td>
                  <td className="border border-gray-300 px-4 py-2">{result.Status}</td>
                  <td className="border border-gray-300 px-4 py-2">{result.Error || "None"}</td>
                  <td className="border border-gray-300 px-4 py-2">{result.RedirectTo || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
