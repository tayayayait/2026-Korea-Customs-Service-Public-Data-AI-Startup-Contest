import { read, utils } from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import * as dotenv from "dotenv";

// Load .env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const filePath = resolve(process.cwd(), "api가이드파일/관세청_HS부호_20260101.xlsx");
  console.log(`Reading file: ${filePath}`);

  try {
    const fileBuffer = readFileSync(filePath);
    const workbook = read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON
    // The columns in the Excel file might vary, so we'll need to map them.
    // Assuming typical columns: HS부호, 한글품명, 영문품명, 수입적용, 수출적용, 단위
    const data: any[] = utils.sheet_to_json(sheet, { defval: "" });
    console.log(`Found ${data.length} rows.`);

    const rowsToInsert = data
      .map((row: any) => ({
        hs_code: row["HS부호"]?.toString().trim(),
        name_ko: row["한글품목명"] || "",
        name_en: row["영문품목명"] || "",
        import_code: row["수입성질코드"] || "",
        export_code: row["수출성질코드"] || "",
        unit_code: row["수량단위코드"] || "",
      }))
      .filter((row) => row.hs_code && row.name_ko); // Filter out empty rows

    console.log(`Prepared ${rowsToInsert.length} valid rows for insertion.`);

    // Bulk insert in chunks of 1000
    const chunkSize = 1000;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      const { error } = await supabase.from("hs_codes").upsert(chunk, { onConflict: "hs_code" });

      if (error) {
        console.error(`Error inserting chunk ${i} - ${i + chunkSize}:`, error);
      } else {
        console.log(
          `Inserted ${i + chunkSize > rowsToInsert.length ? rowsToInsert.length : i + chunkSize} / ${rowsToInsert.length}`,
        );
      }
    }

    console.log("Import completed!");
  } catch (error) {
    console.error("Error during import:", error);
  }
}

main();
