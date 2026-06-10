import * as XLSX from "xlsx";

const filePath = "c:\\Users\\dbcdk\\Desktop\\2026년 관세청 공공데이터·AI 활용 창업경진대회\\api가이드파일\\2026.06.10_해외직구+위해식품+목록.xls";

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log("Headers:", data[0]);
console.log("Row 1:", data[1]);
console.log("Row 2:", data[2]);
console.log("Total rows:", data.length);
