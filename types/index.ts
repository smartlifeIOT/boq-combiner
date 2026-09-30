export interface Sheet1Row {
  [key: string]: string | number;
}

export interface Sheet2Row {
  Categories: string;
  [key: string]: string | number;
}

export interface CombinedOutputRow {
  'TAWAL ID'?: string;
  // Category: string;
  Budget: string | number;
  Project: string;
  Subproject: string | number;
  Contractor: string | number;
  'PO#': string | number;
  'Site ID': string | number;
  'Site Code': string | number;
  'Site Name': string | number;
  'Work type'?: string | number;
  'Item Code': string | number;
  'Description of': string | number;
  'Unit': string | number;
  'Updated Qty': string | number;
  'Unit price': string | number;
  'Total price': string | number;
}

export interface ProcessingResult {
  outputRows: CombinedOutputRow[];
  filteredCount: number;
  uniqueTawalIds: string[];
  uniqueCategories: string[];
}

export interface WorkbookData {
  sheet1: Sheet1Row[];
  sheet2: Sheet2Row[];
  sheet1Name: string;
  sheet2Name: string;
  allSheetNames: string[];
}
