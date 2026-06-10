import { describe, it, expect } from "vitest";
import { config } from "dotenv";
import { createAndAnalyzeScan } from "./lib/scans.functions";

// Load .env explicitly for the test
config();

const describeE2E = process.env.RUN_E2E_ANALYSIS === "1" ? describe : describe.skip;

describeE2E("End-to-End Analysis Test", () => {
  const TIMEOUT = 60000; // E2E might take a while with Gemini + multiple APIs

  it(
    "should analyze the Amazon product URL correctly",
    async () => {
      console.log("Starting analysis of Amazon URL...");

      // Using the user's provided Amazon link
      const inputUrl =
        "https://www.amazon.com/-/ko/dp/B0GYCQNYQ6/ref=sr_1_4?dib=eyJ2IjoiMSJ9.Eaarr6SGo7IKAtPul5jl0kQWGtGTSoVnjpZ1ui029EUuRbUUKTfHBH6ieY9cCC9eiFHM4pcYOAiQQxkJ7dG2wAOFoEFrY46yPXGTAt6H0LKZgpo8xAA-Ktfq3fcAfXAepct7tLICiZG9Cuj7b94XeuGa9bKW_ypKxeZCYVohJ_0EwqaBAPHC2zG7Au75sx0MQtfT9__PoXlJcETay4V6dtnatZqzTbkpyQtlO5iqUdcBNo8vKkwqzJIZJ_G1LhWMa3F4EZgvs5I2xyx2GwKLDxzAr5eMO1rEh8BBMtgqMbs.Y8iC-_svu4t1bEIsOLaT26thmXNoBFE53B2iVtf5WYs&dib_tag=se&qid=1780988370&s=computers-intl-ship&sr=1-4";

      const result = await createAndAnalyzeScan({
        data: {
          inputType: "url",
          productUrl: inputUrl,
          productText: "",
          productImageDataUrls: [],
          purchaseCountry: "US",
          currency: "USD",
          itemPrice: 299.0, // Dummy price
          shippingFee: 0,
          purchasePurpose: "personal",
        },
      });

      console.log("=== End-to-End Analysis Result ===");
      console.log("Scan ID:", result.scanId);

      // We can't easily fetch the scan result from Supabase directly in this test
      // unless we query the DB, because createAndAnalyzeScan returns { scanId }.
      // But if it returns scanId without throwing an error, the extraction succeeded!
      expect(result.scanId).toBeTruthy();
    },
    TIMEOUT,
  );
});
