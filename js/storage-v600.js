
export const APP_VERSION = "6.0.0";
export const STORAGE_KEY = "universalPayrollHubV6";
export const PDF_DB = "universalPayrollHubV6Vault";
export const PDF_STORE = "pdfs";

export function round2(value){
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function shiftDate(value, days){
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeRecord(record){
  const earnings = record.earnings || {
    regular: Number(record.gross || 0),
    overtime: 0, bonus: 0, commission: 0, reimbursement: 0, other: 0
  };
  const taxes = record.taxes || {
    federal: Number(record.federal || 0),
    state: 0, local: 0,
    medicare: Number(record.medicare || 0),
    social: Number(record.social || 0),
    other: 0
  };
  const deductions = record.deductions || {
    retirement: 0, medical: 0, dental: 0, vision: 0, hsa: 0, life: 0, other: 0
  };
  const gross = round2(Object.values(earnings).reduce((a,b)=>a+Number(b||0),0));
  const totalTaxes = round2(Object.values(taxes).reduce((a,b)=>a+Number(b||0),0));
  const totalDeductions = round2(Object.values(deductions).reduce((a,b)=>a+Number(b||0),0));
  return {
    payDate: record.payDate,
    periodStart: record.periodStart || shiftDate(record.payDate, -11),
    periodEnd: record.periodEnd || shiftDate(record.payDate, -5),
    payBasis: record.payBasis || "salary",
    rate: Number(record.rate || 0),
    hours: Number(record.hours || 0),
    earnings,
    taxes,
    deductions,
    employerMatch: Number(record.employerMatch || 0),
    distributions: record.distributions || [],
    gross,
    totalTaxes,
    totalDeductions,
    federal: taxes.federal,
    medicare: taxes.medicare,
    social: taxes.social,
    net: round2(gross - totalTaxes - totalDeductions)
  };
}

const oldRows = [
["2026-03-27",929.59,500,13.48,57.63],["2026-04-03",855.70,500,12.41,53.06],
["2026-04-10",838.29,500,12.15,51.97],["2026-04-17",776.96,500,11.27,48.17]
];

export const initialRecords = oldRows.map(row => normalizeRecord({
  payDate: row[0],
  gross: row[1],
  federal: row[2],
  medicare: row[3],
  social: row[4]
}));

export function defaultState(){
  return {
    version: APP_VERSION,
    profile: {
      name: "Employee",
      company: "Company",
      employeeId: "",
      department: "",
      companyAddress: "",
      joiningDate: "2026-01-01",
      frequency: "biweekly",
      payBasis: "salary",
      photo: null
    },
    records: structuredClone(initialRecords),
    theme: "system",
    notifications: {daysBefore:1, missingPaycheck:true, backupReminder:true, lastBackup:null}
  };
}

export function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if(saved){
      const base = defaultState();
      base.profile = {...base.profile, ...(saved.profile || {})};
      base.records = Array.isArray(saved.records) ? saved.records.map(normalizeRecord) : base.records;
      base.theme = saved.theme || base.theme;
      base.notifications = {...base.notifications, ...(saved.notifications || {})};
      return base;
    }

    // Migrate from V5 keys when present
    const older = ["pushpaPayrollHubV5", "pushpaPayrollHubV5.1", "pushpaPayrollHubV5_1"]
      .map(key => {
        try{return JSON.parse(localStorage.getItem(key) || "null")}catch{return null}
      }).find(Boolean);
    if(older){
      const base = defaultState();
      base.profile = {...base.profile, ...(older.profile || {})};
      base.records = Array.isArray(older.records) ? older.records.map(normalizeRecord) : base.records;
      base.theme = older.theme || base.theme;
      return base;
    }
    return defaultState();
  }catch{
    return defaultState();
  }
}

export function saveState(state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function openPdfDatabase(){
  return new Promise((resolve,reject)=>{
    const request = indexedDB.open(PDF_DB,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(PDF_STORE))db.createObjectStore(PDF_STORE,{keyPath:"id"});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
export async function getAllPdfs(){
  const db=await openPdfDatabase();
  return new Promise((resolve,reject)=>{
    const request=db.transaction(PDF_STORE).objectStore(PDF_STORE).getAll();
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
export async function savePdf(doc){
  const db=await openPdfDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PDF_STORE,"readwrite");
    tx.objectStore(PDF_STORE).put(doc);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
}
export async function removePdf(id){
  const db=await openPdfDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PDF_STORE,"readwrite");
    tx.objectStore(PDF_STORE).delete(id);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
}
export async function clearPdfs(){
  const db=await openPdfDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PDF_STORE,"readwrite");
    tx.objectStore(PDF_STORE).clear();
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
}
