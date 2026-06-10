import * as XLSX from "xlsx";
import { embed } from "ai";
import { createVertex } from "@ai-sdk/google-vertex";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

if (!SUPABASE_URL || !GEMINI_API_KEY) {
  console.error("Missing required environment variables (SUPABASE_URL, GEMINI_API_KEY)");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const google = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION,
});

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_PATH = path.resolve(
  __dirname,
  "../api가이드파일/2026.06.10_해외직구+위해식품+목록.xls"
);

async function seed() {
  console.log(`Reading Excel file: ${FILE_PATH}`);
  if (!fs.existsSync(FILE_PATH)) {
    console.error("File not found!");
    process.exit(1);
  }

  const buf = fs.readFileSync(FILE_PATH);
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Parse as array of arrays
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  
  const ingredientsSet = new Set<string>();

  console.log("Extracting ingredients...");
  // Skip header (index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;
    
    // index 4: 검출성분(영어), index 5: 검출성분(한글)
    const ingredientEng = String(row[4] || "").trim();
    const ingredientKor = String(row[5] || "").trim();
    
    if (!ingredientEng && !ingredientKor) continue;

    // 영어 성분명이 여러 개인 경우 (예: "Theobromine, Yohimbine")
    const partsEng = ingredientEng.split(",").map(s => s.trim()).filter(s => s);
    const partsKor = ingredientKor.split(",").map(s => s.trim()).filter(s => s);

    for (let j = 0; j < Math.max(partsEng.length, partsKor.length); j++) {
      const eng = partsEng[j] || "";
      const kor = partsKor[j] || "";
      
      if (eng || kor) {
        // 객체를 문자열화하여 Set에 저장 (중복 제거용)
        ingredientsSet.add(JSON.stringify({ name: eng || kor, alias: kor || eng }));
      }
    }
  }

  const ingredients = Array.from(ingredientsSet).map(s => JSON.parse(s));
  console.log(`Found ${ingredients.length} unique ingredients. Starting embedding process...`);

  console.log("Clearing existing wrong data from Supabase...");
  await supabaseAdmin.from("ingredient_vectors").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // To avoid rate limits, we process in batches
  const BATCH_SIZE = 10;
  for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
    const batch = ingredients.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(ingredients.length / BATCH_SIZE)}...`);
    
    try {
      const recordsToInsert = [];
      
      for (const ingredient of batch) {
        const embedText = ingredient.name + (ingredient.alias && ingredient.name !== ingredient.alias ? ` (${ingredient.alias})` : "");
        const { embedding } = await embed({
          model: google.textEmbeddingModel("text-multilingual-embedding-002"),
          value: embedText,
        });
        
        recordsToInsert.push({
          ingredient_name: ingredient.name,
          ingredient_alias: ingredient.alias !== ingredient.name ? ingredient.alias : null,
          embedding,
        });
      }

      // Insert into Supabase
      const { error } = await supabaseAdmin
        .from("ingredient_vectors")
        .insert(recordsToInsert);

      if (error) {
        console.error("Error inserting batch:", error);
      } else {
        console.log(`Successfully inserted batch ${i / BATCH_SIZE + 1}`);
      }
      
      // Delay to respect API rate limits
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`Failed to process batch ${i / BATCH_SIZE + 1}:`, err);
    }
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
