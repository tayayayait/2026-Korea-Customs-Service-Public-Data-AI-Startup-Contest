import * as XLSX from "xlsx";
import * as fs from "fs";

const FILE_PATH = "c:/Users/dbcdk/Desktop/2026년 관세청 공공데이터·AI 활용 창업경진대회/api가이드파일/2026.06.10_해외직구+위해식품+목록.xls";
const buf = fs.readFileSync(FILE_PATH);
const workbook = XLSX.read(buf, { type: "buffer" });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
console.log("Headers:", rows[0]);
console.log("Row 1:", rows[1]);
console.log("Row 2:", rows[2]);
console.log("Row 3:", rows[3]);
