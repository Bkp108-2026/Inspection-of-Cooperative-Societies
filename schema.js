// Schema mirrors the uploaded "inspection_proforma_blank_App.docx" section by section.
const HEADER_FIELDS = [
  { type: "text", key: "header.district", label: "জেলার নাম (Name of the District)" },
  { type: "text", key: "header.constituency", label: "বিধানসভা কেন্দ্র (Assembly Constituency)" },
  { type: "text", key: "header.range", label: "রেঞ্জের নাম (Name of the Range)" },
  { type: "text", key: "header.subdivision", label: "মহকুমা (Sub-Division)" },
  { type: "text", key: "header.block", label: "ব্লক/সার্কেল (Block/Circle)" },
  { type: "date", key: "header.inspectionDate", label: "পরিদর্শনের তারিখ (Date of Inspection)" },
  { type: "text", key: "header.officers", label: "অফিসারের নাম (Name of the Officer(s))" },
  { type: "text", key: "header.officerDesignation", label: "পদবি (Designation) — এটি রিপোর্টের স্বাক্ষরের জায়গায় প্রথম লাইনে যাবে" },

  {
    type: "select", key: "header.isJointInspection", rerenderOnChange: true,
    label: "এটি কি Joint Inspection?",
    options: ["হ্যাঁ (Yes)", "না (No)"],
  },
  {
    type: "dynamic-table", key: "header.additionalOfficers", addLabel: "আরেকজন অফিসার যোগ করুন (Add Another Officer)",
    columns: [
      { key: "name", label: "১. নাম (Name)" }, { key: "designation", label: "২. Designation" },
      { key: "blockCircleHQ", label: "৩. Block/Circle/Head Quarter" },
    ],
    showIf: { key: "header.isJointInspection", equals: "হ্যাঁ (Yes)" },
  },
];

const DEPOSIT_LIABILITY_ROWS = ["S.B A/C", "Term Deposit", "F.D A/C", "R.D A/C", "SHG S.B A/C", "DBS A/C", "Others", "Total"];

const PHOTO_CATEGORIES = [
  "পরিদর্শনের ছবি (Inspection Photo)",
  "অফিস ঘরের ছবি (Office Room Photo)",
  "গোডাউন / কোল্ড স্টোরেজের ছবি (Godown / Cold Storage Photo)",
  "অন্যান্য (Other)",
];

// ---------- Shared helper: a Yes/No question (always re-renders, since most of these gate a follow-up field) ----------
function yn(key, label, showIf) {
  const f = { type: "select", key, label, options: ["হ্যাঁ (Yes)", "না (No)"], rerenderOnChange: true };
  if (showIf) f.showIf = showIf;
  return f;
}

const GOVT_YES = { key: "h.hasScheme", equals: "হ্যাঁ (Yes)" };
const GOVT_SCHEME_LIST = [
  "১. PACS as Pradhan Mantri Kisan Samriddhi Kendras (PMKSKs)",
  "২. PACS as Jan Aushadhi Kendras",
  "৩. PACS as Common Service Centres (CSCs)",
  "৪. PM-KUSUM Convergence",
  "৫. PACS as Paani Samiti",
  "৬. PACS for LPG Distributorship",
  "৭. Conversion of Bulk Consumer Petrol Pumps into Retail Outlets",
  "৮. Micro-ATMs for Bank Mitra Co-operative Societies",
  "৯. Membership of BBSSL, NCOL and NCEL",
  "১০. NAFED and NCCF Portal Registration",
  "১১. NDDB Milk Pooling Points and Milk Collection Centres as M-VCS",
  "১২. PACS as Pashu Aushadhi Vikray Kendras (PAVKs)",
  "১৩. NCDC Financial Assistance for Deep-Sea Trawlers",
  "১৪. CSP - NCDC",
  "১৫. CHC - FMH / CHC",
  "১৬. Sufala Scheme",
  "১৭. Surya Kiran",
  "১৮. PM Surya Ghar",
];
const GOVT_REQUIRED_DOCS = [
  "জমি সংক্রান্ত নথি (Land-related documents)", "Panchayat অনুমতি (Panchayat Permission)", "Municipality/ULB অনুমতি (Municipality/ULB Permission)", "Building/Construction অনুমতি (Building/Construction Permission)",
  "Trade/Business Licence", "Board Resolution", "Registration Certificate", "Bank-related documents",
  "অন্যান্য সরকারি অনুমোদন (Other Government Approvals)",
];

const FPS_YES = { key: "i.hasFPS", equals: "হ্যাঁ (Yes)" };
const FPS_CLOSED_REASONS = [
  "ডিলার সংক্রান্ত সমস্যা (Dealer-related problem)", "প্রশাসনিক সমস্যা (Administrative problem)", "Stock না পাওয়া (Stock not available)", "Licence/অনুমোদন সংক্রান্ত সমস্যা (Licence/Permission-related problem)",
];
const FPS_PROBLEM_TYPES = [
  "Stock Supply", "Transport", "e-POS/Technical", "Electricity", "Internet/Network",
  "Infrastructure", "Storage", "Beneficiary-related", "Administrative", "Financial",
];
function fpsDocRow(key, label) {
  const statusKey = `i.docs.${key}.status`;
  return [
    { type: "select", key: statusKey, label: `${label} — আছে/নেই (Present/Absent)`, options: ["আছে (Present)", "নেই (Absent)"], rerenderOnChange: true, showIf: FPS_YES },
    { type: "select", key: `i.docs.${key}.updated`, label: `${label} — হালনাগাদ আছে? (Is it Updated?)`, options: ["হ্যাঁ (Yes)", "না (No)"], showIf: [FPS_YES, { key: statusKey, equals: "আছে (Present)" }] },
  ];
}

const HOUSING_YES = { key: "housing.isHousing", equals: "হ্যাঁ (Yes)" };
const HOUSING_UNDER_CONSTRUCTION = [HOUSING_YES, { key: "housing.land.projectStatus", equals: "নির্মাণাধীন (Under construction)" }];

const TRAINING_TYPES = [
  "কর্মচারী প্রশিক্ষণ (Employee Training)",
  "SHG প্রশিক্ষণ/সচেতনতা শিবির (SHG Training/Awareness Camp)",
  "Members Training / Awareness Camp",
  "BOD Training / Awareness Camp",
  "Farmers Training / Awareness Camp",
  "Technical Training by Bank/Govt/Software Company to the Societies",
  "Any other(s)",
];

function trainingCommonColumns(sruColumns) {
  return [
    { key: "programme", label: "Name of the Training Programme / Awareness" },
    { key: "organisedBy", label: "Organised by" },
    { key: "startDay", label: "Starting Day" },
    { key: "endDay", label: "Ending Day" },
    { key: "totalDays", label: "Total Day(s)" },
    { key: "totalGroups", label: "Total Participants Groups" },
    { key: "totalMembers", label: "Total Participants Members" },
    { key: "totalFund", label: "Total Allotted fund" },
    ...sruColumns,
    { key: "remarks", label: "Remarks" },
  ];
}
const TRAINING_SHG_COLUMNS = trainingCommonColumns([
  { key: "srUc", label: "SR-UC Submitted or not" },
  { key: "billVoucher", label: "Bill Voucher, Attendance Sheet etc preparing or not" },
]);
const TRAINING_GENERIC_COLUMNS = trainingCommonColumns([
  { key: "srUc", label: "SR-UC or Relevant Papers Submitted or not" },
]);
const TRAINING_EMPLOYEE_COLUMNS = [
  { key: "employeeName", label: "Name of the Participant Employee(s)" },
  { key: "course", label: "Course / Training Programme name" },
  { key: "organisedBy", label: "Organised by" },
  { key: "duration", label: "Duration of Programme / Course" },
  { key: "fundBy", label: "Fund Allotted by" },
  { key: "remarks", label: "Remarks" },
];
const TRAINING_TECHNICAL_COLUMNS = [
  { key: "employeeName", label: "Name of the Employee(s)" },
  { key: "designation", label: "Designation" },
  { key: "duration", label: "Duration of the Training" },
  { key: "sponsoredBy", label: "Sponsored / Organised by" },
  { key: "fund", label: "Any Fund Allotted (If Yes, write amount; if No, NA)" },
  { key: "purpose", label: "Purpose / Field / Subject of the Training" },
  { key: "remarks", label: "Remarks" },
];
const TRAINING_OTHER_COLUMNS = [
  { key: "subject", label: "Subject / Field of the Training Programme / Awareness Camp" },
  { key: "totalParticipants", label: "Total Participants" },
  { key: "duration", label: "Duration" },
  { key: "fund", label: "Any Fund Allotted (If Yes, write amount; if No, NA)" },
  { key: "purpose", label: "Purpose" },
  { key: "organisedBy", label: "Organised By" },
  { key: "remarks", label: "Remarks" },
];

const SCHEMA = [
  {
    key: "photos", title: "ছবি ও অবস্থান (Photos & Location) — Optional",
    color: "#0369A1", colorSoft: "#DCEEFB", shortLabel: "📷",
    fields: [
      {
        type: "select", key: "photos.wantPhotos", rerenderOnChange: true,
        label: "আপনি কি পরিদর্শনের বা সমিতির ছবি তুলতে/যোগ করতে চান? (Do you want to take/add photos of the inspection or the Society?)",
        options: ["হ্যাঁ (Yes)", "না (No)"],
      },
      {
        type: "photo-capture", key: "photos.items", maxPhotos: 3, categories: PHOTO_CATEGORIES,
        showIf: { key: "photos.wantPhotos", equals: "হ্যাঁ (Yes)" },
      },
    ],
  },
  {
    key: "a", title: "A. সাধারণ তথ্য (General Information)",
    color: "#2563A6", colorSoft: "#DCE8F5", shortLabel: "A",
    fields: [
      { type: "text", key: "a.name", label: "সমিতির নাম (Name of the Society)" },
      { type: "textarea", key: "a.address", label: "ঠিকানা (Address of the Society)" },
      { type: "text", key: "a.regNoDate", label: "নিবন্ধন নং ও তারিখ (Registration No. & Date)" },
      { type: "text", key: "a.type", label: "সমিতির ধরন (Type of Society)" },
      { type: "text", key: "a.ncdNumber", label: "NCD নম্বর" },
      { type: "text", key: "a.contact", label: "যোগাযোগ নম্বর (Contact Number)" },
      { type: "text", key: "a.email", label: "ইমেইল (E-mail)" },

      { type: "subheading", label: "সদস্যপদ এলাকা (Area of Membership)" },
      { type: "textarea", key: "a.fallsUnderArea", label: "সমিতি কোন বা কোন কোন এলাকার মধ্যে পড়ে? (Which area(s) does the Society fall under?)" },
      { type: "textarea", key: "a.operationalArea", label: "কোন কোন এলাকা সমিতির সদস্যপদ এলাকা (Area of Membership)" },
      {
        type: "select", key: "a.worksOutsideArea", rerenderOnChange: true,
        label: "সমিতি তার সদস্যপদ এলাকার বাইরে কোনো এলাকায় কার্য করে? (Does the Society operate in any area outside its Area of Membership?)",
        options: ["হ্যাঁ (Yes)", "না (No)"],
      },
      { type: "text", key: "a.outsideArea.district", label: "জেলা (District)", showIf: { key: "a.worksOutsideArea", equals: "হ্যাঁ (Yes)" } },
      { type: "text", key: "a.outsideArea.blockMuniCorp", label: "ব্লক/মিউনিসিপ্যালিটি/কর্পোরেশন (Block/Municipality/Corporation)", showIf: { key: "a.worksOutsideArea", equals: "হ্যাঁ (Yes)" } },
      { type: "textarea", key: "a.outsideArea.details", label: "তার বিবরণ (Details)", showIf: { key: "a.worksOutsideArea", equals: "হ্যাঁ (Yes)" } },
      {
        type: "select", key: "a.outsideArea.hasPermission", rerenderOnChange: true,
        label: "কোনো অনুমতি আছে কি না? (Is there any permission?)",
        options: ["হ্যাঁ (Yes)", "না (No)"],
        showIf: { key: "a.worksOutsideArea", equals: "হ্যাঁ (Yes)" },
      },
      {
        type: "textarea", key: "a.outsideArea.permissionDetails", label: "হ্যাঁ হলে তার বিবরণ (If Yes, details)",
        showIf: [{ key: "a.worksOutsideArea", equals: "হ্যাঁ (Yes)" }, { key: "a.outsideArea.hasPermission", equals: "হ্যাঁ (Yes)" }],
      },

      { type: "subheading", label: "কার্যালয় (Office)" },
      {
        type: "select", key: "a.officeLocationType", rerenderOnChange: true,
        label: "সমিতির অফিস ঘর কোন জায়গায় স্থিত? (Where is the Society's Office Room situated?)",
        options: ["পঞ্চায়েত (Gram Panchayat)", "মিউনিসিপ্যাল (Municipality)", "কর্পোরেশন (Corporation)", "নেই (None)", "অন্য কোনো এলাকা (Other Area)"],
      },
      {
        type: "text", key: "a.officeLocationOther", label: "অন্য কোনো এলাকা হলে, কোন এলাকা (If Other Area, please specify)",
        showIf: { key: "a.officeLocationType", equals: "অন্য কোনো এলাকা (Other Area)" },
      },
      { type: "text", key: "a.officeLandmark", label: "অফিস ঘরের Landmark (Landmark of the Office Room)" },

      { type: "subheading", label: "সদস্যপদ (Membership — as per register)" },
      { type: "number", key: "a.membership.individual.general", label: "ব্যক্তি সদস্য — General" },
      { type: "number", key: "a.membership.individual.sc", label: "ব্যক্তি সদস্য — SC" },
      { type: "number", key: "a.membership.individual.st", label: "ব্যক্তি সদস্য — ST" },
      { type: "number", key: "a.membership.individual.women", label: "ব্যক্তি সদস্য — Women" },
      { type: "number", key: "a.membership.universal.general", label: "Universal সদস্য — General" },
      { type: "number", key: "a.membership.universal.sc", label: "Universal সদস্য — SC" },
      { type: "number", key: "a.membership.universal.st", label: "Universal সদস্য — ST" },
      { type: "number", key: "a.membership.universal.women", label: "Universal সদস্য — Women" },
      { type: "number", key: "a.notListed", label: "রেজিস্টারে তালিকাভুক্ত নয় এমন সদস্য সংখ্যা (No. of Members not listed in Register)" },
      { type: "number", key: "a.notSigned", label: "রেজিস্টারে স্বাক্ষর করেননি এমন সদস্য সংখ্যা (No. of Members who have not signed the Register)" },
      { type: "number", key: "a.newMembers", label: "এই বছরে নতুন সদস্য সংখ্যা (No. of New Members this year)" },
      { type: "text", key: "a.target", label: "সদস্যপদ বৃদ্ধির লক্ষ্যমাত্রা (এই অর্থবছরে) (Target for Membership Growth — this financial year)" },

      { type: "subheading", label: "ব্যাংক ও নিরীক্ষা (Bank & Audit)" },
      { type: "text", key: "a.financingBank", label: "Financing Bank-এর নাম (Name of Financing Bank)" },
      { type: "text", key: "a.bylawBank", label: "সমিতির বাই-ল অনুসারে উল্লিখিত ব্যাংকের নাম (Bank name as per Society's By-law, where money can be deposited)" },
      { type: "text", key: "a.auditUpto", label: "নিরীক্ষা সম্পন্ন (Audit completed up-to)" },

      { type: "subheading", label: "সভার তথ্য (Meetings)" },
      { type: "date", key: "a.agm.date", label: "সর্বশেষ AGM-এর তারিখ (Date of last AGM)" },
      { type: "number", key: "a.agm.membersPresent", label: "AGM-এ উপস্থিত সদস্য (Members present at AGM)" },
      { type: "text", key: "a.agm.quorum", label: "AGM-এর Quorum (যেমন: 1/3, 1/5, 1/2)" },
      { type: "date", key: "a.hgm.date", label: "সর্বশেষ HGM-এর তারিখ (Date of last HGM)" },
      { type: "number", key: "a.hgm.membersPresent", label: "HGM-এ উপস্থিত সদস্য (Members present at HGM)" },
      { type: "date", key: "a.sgm.date", label: "সর্বশেষ SGM-এর তারিখ (যদি থাকে) (Date of last SGM, if any)" },
      { type: "text", key: "a.sgm.purpose", label: "SGM-এর উদ্দেশ্য (Purpose of SGM)" },
      { type: "number", key: "a.sgm.membersPresent", label: "SGM-এ উপস্থিত সদস্য (Members present at SGM)" },

      { type: "subheading", label: "শাখা (Branch)" },
      yn("a.hasBranch", "সমিতির কোনো Branch আছে কি? (Does the Society have any Branch?)"),
      {
        type: "dynamic-table", key: "a.branches", addLabel: "শাখা যোগ করুন (Add Branch)",
        columns: [
          { key: "address", label: "ঠিকানা (Address)" },
          { key: "distance", label: "সমিতি থেকে ব্রাঞ্চের দূরত্ব (Distance from Society)" },
          { key: "inchargeName", label: "ব্রাঞ্চ ইনচার্জের নাম (Branch In-charge Name)" },
          { key: "inchargePhone", label: "ব্রাঞ্চ ইনচার্জের ফোন নম্বর (Phone No.)" },
        ],
        showIf: { key: "a.hasBranch", equals: "হ্যাঁ (Yes)" },
      },

      { type: "number", key: "a.roomCount", label: "সমিতির ঘর কতগুলি (গোডাউন ছাড়া) (No. of Rooms, excluding Godown)" },
      yn("a.hasFireExtinguisher", "সমিতিতে কোনো Fire Extinguisher ব্যবস্থাপনা আছে নাকি? (Is there any Fire Extinguisher arrangement in the Society?)"),
      yn("a.hasCCTV", "সমিতিতে CCTV Surveillance Camera আছে কি না? (Is there CCTV Surveillance in the Society?)"),

      { type: "subheading", label: "অন্যান্য (Others)" },
      { type: "text", key: "a.workingHours", label: "কার্যকাল (Working Hours)" },
      { type: "textarea", key: "a.infrastructure", label: "অবকাঠামো ও সরঞ্জাম (Infrastructure & Equipment)" },

      { type: "subheading", label: "সমিতির ব্যবসা (Business Activities of the Society)" },
      {
        type: "dynamic-table", key: "a.businessTypes", addLabel: "ব্যবসা যোগ করুন (Add Business)",
        columns: [{ key: "business", label: "সমিতি কী কী ব্যবসা করে? (What business does the Society do?)" }],
      },
      { type: "subheading", label: "উৎপাদিত দ্রব্য (Products Produced, if any)" },
      {
        type: "dynamic-table", key: "a.productsProduced", addLabel: "দ্রব্য যোগ করুন (Add Product)",
        columns: [{ key: "product", label: "সমিতি কোন দ্রব্য উৎপাদন করে? (What product does the Society produce?)" }],
      },

      { type: "subheading", label: "১০. SHG স্ট্যাটাস (SHG Status of the Society)" },
      yn("a.hasSHG", "সমিতির SHG আছে কি না?"),
      {
        type: "matrix-table", key: "a.shg",
        rows: ["No. of SHG Savings Linked", "No. of SHG Credit Linked", "Total"],
        columns: [
          { key: "totalGroups", label: "Total Groups" }, { key: "maleGroup", label: "Male Group" },
          { key: "femaleGroup", label: "Female Group" }, { key: "sc", label: "SC" }, { key: "st", label: "ST" },
          { key: "minority", label: "Minority" }, { key: "totalDeposit", label: "Total Deposit" },
          { key: "totalLoanIssued", label: "Total Loan Issued" }, { key: "remarks", label: "Remarks" },
        ],
        showIf: { key: "a.hasSHG", equals: "হ্যাঁ (Yes)" },
      },

      { type: "select", key: "a.byLawsExists", rerenderOnChange: true, label: "১১. উপ-বিধি আছে কি? (By-Laws of the Society)", options: ["হ্যাঁ (Yes)", "না (No)"] },
      { type: "date", key: "a.byLawsLastAmendment", label: "সর্বশেষ সংশোধনের তারিখ (Last Amendment Date)", showIf: { key: "a.byLawsExists", equals: "হ্যাঁ (Yes)" } },

      { type: "select", key: "a.hasWBCSBooks", label: "১২. সমিতির কাছে WBCS Act 2006 ও Rules 2011 সংক্রান্ত বই আছে কি? (Does the cooperative society have the books containing the new laws — WBCS Act 2006 & Rules 2011?)", options: ["হ্যাঁ (Yes)", "না (No)"] },
      { type: "select", key: "a.has15CEC", label: "১৩. সমিতির কাছে কি 15 CEC-এর কপি আছে? (Does the Society have a copy of 15 CEC?)", options: ["হ্যাঁ (Yes)", "না (No)"] },
      { type: "select", key: "a.hasInspectionBook", label: "সমিতির Inspection Book আছে কি না? (Does the Society have an Inspection Book?)", options: ["হ্যাঁ (Yes)", "না (No)"] },
    ],
  },
  {
    key: "b", title: "B. ব্যবস্থাপনা (Management of Society)",
    color: "#B4791F", colorSoft: "#F3E6D0", shortLabel: "B",
    fields: [
      {
        type: "select", key: "b.boardStatus", rerenderOnChange: true,
        label: "বোর্ডের অবস্থা (Status of Board)",
        options: ["Elected", "Nominated", "Administrator", "Special Officer", "Others"],
      },
      {
        type: "textarea", key: "b.boardStatusOtherDetail", rows: 3,
        label: "বিস্তারিত বিবরণ (Others নির্বাচিত হলে, Inspecting Officer তাঁর দৃষ্টিভঙ্গি লিখুন)",
        showIf: { key: "b.boardStatus", equals: "Others" },
      },
      { type: "date", key: "b.boardElectionDate", label: "বর্তমান বোর্ড নির্বাচনের তারিখ (Date of Election of Current Board)" },
      { type: "date", key: "b.officeBearerElectionDate", label: "পদাধিকারী নির্বাচনের তারিখ (Date of Election of Office Bearer)" },
      yn("b.wasDelegateElection", "সমিতির সদস্য অনুসারে শেষ নির্বাচন কি ডেলিগেট নির্বাচন হয়েছিল? (Was the last election, as per Society membership, a Delegate election?)"),
      { type: "date", key: "b.delegateElectionDate", label: "ডেলিগেট নির্বাচনের তারিখ (Date of Delegate Election)", showIf: { key: "b.wasDelegateElection", equals: "হ্যাঁ (Yes)" } },
      { type: "number", key: "b.totalDelegatesElected", label: "মোট নির্বাচিত ডেলিগেট সংখ্যা (Total No. of Delegates Elected)", showIf: { key: "b.wasDelegateElection", equals: "হ্যাঁ (Yes)" } },
      { type: "number", key: "b.totalBoardMembers", label: "মোট বোর্ড সদস্যের সংখ্যা (Total No. of Board Members)" },

      { type: "number", key: "b.signatoryCount", label: "সমিতিতে বর্তমানে Signatory Authority(s) কতজন?" },
      {
        type: "dynamic-table", key: "b.signatories", addLabel: "যোগ করুন (Add)",
        columns: [{ key: "name", label: "নাম (Name)" }, { key: "designation", label: "Designation" }],
      },

      yn("b.hasEmployeeReps", "সমিতির কোনো Employee Representative(s) বোর্ডে আছে কি না?"),
      {
        type: "dynamic-table", key: "b.employeeReps", addLabel: "যোগ করুন (Add)",
        columns: [{ key: "name", label: "নাম (Name)" }, { key: "designation", label: "Designation" }],
        showIf: { key: "b.hasEmployeeReps", equals: "হ্যাঁ (Yes)" },
      },

      { type: "subheading", label: "নির্বাচিত পরিচালক (Elected Directors)" },
      {
        type: "dynamic-table", key: "b.directors.elected", addLabel: "পরিচালক যোগ করুন (Add Director)",
        columns: [
          { key: "name", label: "নাম (Name)" }, { key: "designation", label: "পদবি/ক্যাটাগরি (Designation/Category)" },
          { key: "tenure", label: "মেয়াদ (Tenure in office)" }, { key: "mobile", label: "মোবাইল নং (Mobile No.)" },
        ],
      },
      { type: "subheading", label: "কার্যনির্বাহী পরিচালক (Functional Directors)" },
      {
        type: "dynamic-table", key: "b.directors.functional", addLabel: "পরিচালক যোগ করুন (Add Director)",
        columns: [
          { key: "name", label: "নাম (Name)" }, { key: "designation", label: "পদবি (Designation)" },
          { key: "tenure", label: "মেয়াদ (Tenure in office)" }, { key: "mobile", label: "মোবাইল নং (Mobile No.)" },
        ],
      },
      { type: "number", key: "b.boardMeetings", label: "এ পর্যন্ত অনুষ্ঠিত বোর্ড সভার সংখ্যা (No. of Board Meetings held so far)" },
      { type: "text", key: "b.boardMeetingQuorum", label: "বোর্ড মিটিংয়ের Quorum (Quorum of Board Meeting) (যেমন: 1/3, 2/3, 3/4)" },

      { type: "subheading", label: "কর্মী তালিকা (Staff Position)" },
      {
        type: "dynamic-table", key: "b.staff", addLabel: "কর্মী যোগ করুন (Add Staff)",
        columns: [
          { key: "name", label: "নাম (Name)" }, { key: "qualification", label: "যোগ্যতা (Qualification)" }, { key: "designation", label: "পদবি (Designation)" },
          { key: "joiningDate", label: "যোগদানের তারিখ (Date of Joining)" }, { key: "recruitment", label: "নিয়োগ পদ্ধতি (Mode of Recruitment)" },
          { key: "salary", label: "বেতন (Salary — mention scale, if any)" }, { key: "adhoc", label: "Ad-hoc কিনা (Whether Ad-hoc)" },
        ],
      },
      { type: "number", key: "b.totalAdhocStaff", label: "সমিতির মোট কত সদস্য বর্তমানে Ad-hoc পান? (How many staff currently receive Ad-hoc)" },
      { type: "number", key: "b.lastOrderAdhocAmount", label: "শেষ অর্ডার অনুসারে কত টাকা পেয়েছিল? (Amount received as per last order, ₹)" },

      yn("b.hasGPRep", "সমিতিতে কোনো গ্রাম পঞ্চায়েত / পঞ্চায়েত সমিতি প্রতিনিধি আছে কি না?"),
      {
        type: "dynamic-table", key: "b.gpReps", addLabel: "যোগ করুন (Add)",
        columns: [
          { key: "name", label: "নাম (Name)" }, { key: "designation", label: "Designation" },
          { key: "gpName", label: "গ্রাম পঞ্চায়েত/পঞ্চায়েত সমিতির নাম" }, { key: "selectionDate", label: "Day of Selection" },
        ],
        showIf: { key: "b.hasGPRep", equals: "হ্যাঁ (Yes)" },
      },

      yn("b.hasBankRep", "সমিতিতে কোনো ব্যাংক প্রতিনিধি আছে কি না?"),
      {
        type: "dynamic-table", key: "b.bankReps", addLabel: "যোগ করুন (Add)",
        columns: [
          { key: "name", label: "নাম (Name)" }, { key: "designation", label: "Designation" },
          { key: "bankName", label: "ব্যাংকের নাম" }, { key: "branch", label: "শাখা (Branch)" }, { key: "selectionDate", label: "Day of Selection" },
        ],
        showIf: { key: "b.hasBankRep", equals: "হ্যাঁ (Yes)" },
      },

      yn("b.hasGovtRep", "সমিতিতে কোনো সরকারি প্রতিনিধি আছে কি না?"),
      {
        type: "dynamic-table", key: "b.govtReps", addLabel: "যোগ করুন (Add)",
        columns: [
          { key: "name", label: "নাম (Name)" }, { key: "designation", label: "Designation" },
          { key: "officeName", label: "অফিসের নাম" }, { key: "selectionDate", label: "Day of Selection" },
        ],
        showIf: { key: "b.hasGovtRep", equals: "হ্যাঁ (Yes)" },
      },
    ],
  },
  {
    key: "c", title: "C. আর্থিক অবস্থা (Financial Position)",
    color: "#166534", colorSoft: "#DCEDE0", shortLabel: "C",
    fields: [
      { type: "subheading", label: "শেয়ার মূলধন (Share Capital)" },
      { type: "number", key: "c.share.authorized", label: "অনুমোদিত শেয়ার মূলধন (Authorized Share Capital)" },
      { type: "number", key: "c.share.paidUp", label: "প্রদত্ত শেয়ার মূলধন (Paid Up Share Capital)" },
      { type: "number", key: "c.share.govt", label: "সরকারি শেয়ার (Govt. Share)" },
      { type: "number", key: "c.share.society", label: "সমিতির শেয়ার (Society's Share)" },
      { type: "number", key: "c.share.individual", label: "ব্যক্তিগত শেয়ার (Individual Share)" },
      { type: "number", key: "c.share.others", label: "অন্যান্য (Others)" },
      { type: "number", key: "c.share.certificatesIssued", label: "ইস্যুকৃত শেয়ার সার্টিফিকেট সংখ্যা (No. of Share Certificates Issued)" },
      { type: "number", key: "c.share.refunded", label: "এই অর্থবছরে ফেরতকৃত শেয়ার (Share Refunded this Financial Year — Amount)" },

      { type: "subheading", label: "সরকারি ঋণ/সহায়তা প্রাপ্তি (Govt. Loans/Financial Assistance Received)" },
      {
        type: "dynamic-table", key: "c.govtLoans.received", addLabel: "যোগ করুন (Add)",
        columns: [
          { key: "goNoDate", label: "G.O. No. & Date" }, { key: "amount", label: "পরিমাণ (Amount)" },
          { key: "purpose", label: "উদ্দেশ্য (Purpose)" }, { key: "submissionUC", label: "U/C জমার অবস্থা (Status of U/C Submission)" },
        ],
      },
      { type: "subheading", label: "সরকারি শেয়ার/ঋণ ফেরত (Refund of Govt. Share/Loans)" },
      {
        type: "dynamic-table", key: "c.govtLoans.refund", addLabel: "যোগ করুন (Add)",
        columns: [
          { key: "shareLoan", label: "Share/Loan" }, { key: "challanNumber", label: "চালান নম্বর (Challan Number)" },
          { key: "date", label: "তারিখ (Date)" }, { key: "amount", label: "পরিমাণ (Amount)" },
        ],
      },

      { type: "subheading", label: "বীমা কভারেজ (Insurance Coverage)" },
      {
        type: "dynamic-table", key: "c.insurance", addLabel: "যোগ করুন (Add)",
        columns: [
          { key: "company", label: "বীমা কোম্পানি (Insurance Company)" }, { key: "type", label: "বীমার ধরন (Type of Insurance)" },
          { key: "period", label: "মেয়াদ (Period)" }, { key: "amountInsured", label: "বীমাকৃত পরিমাণ (Amount Insured)" }, { key: "premiumPaid", label: "প্রিমিয়াম (Premium Paid)" },
        ],
      },

      { type: "subheading", label: "গত ৩ বছরের বছরের নাম লিখুন (শুধু যতগুলো বছরের তথ্য দেবেন ততগুলো লিখুন, যেমন Y1: ২০২৪-২০২৫)" },
      { type: "text", key: "c.yearLabels.y1", label: "Y1 (সাম্প্রতিকতম বছর)" },
      { type: "text", key: "c.yearLabels.y2", label: "Y2" },
      { type: "text", key: "c.yearLabels.y3", label: "Y3" },

      { type: "subheading", label: "ক্রয়-বিক্রয় ও মজুদ — গত ৩ বছর (Purchase, Sale & Stock)" },
      {
        type: "matrix-table", key: "c.purchaseSale",
        rows: ["Fertilizer", "Pesticide/Insecticide", "Seeds", "Agril. inputs", "Consumer", "Others"],
        columns: [
          { key: "y1purchase", label: "Y1 Purchase", dynamicLabelKey: "c.yearLabels.y1" }, { key: "y1sale", label: "Y1 Sale", dynamicLabelKey: "c.yearLabels.y1" },
          { key: "y2purchase", label: "Y2 Purchase", dynamicLabelKey: "c.yearLabels.y2" }, { key: "y2sale", label: "Y2 Sale", dynamicLabelKey: "c.yearLabels.y2" },
          { key: "y3purchase", label: "Y3 Purchase", dynamicLabelKey: "c.yearLabels.y3" }, { key: "y3sale", label: "Y3 Sale", dynamicLabelKey: "c.yearLabels.y3" },
          { key: "stock", label: "বর্তমান মজুদ (Stock as on date)" },
        ],
      },

      { type: "subheading", label: "ঋণ ব্যবসা — গত ৩ বছর (Agril/Non-Agril Credit Business)" },
      {
        type: "matrix-table", key: "c.creditBusiness",
        rows: ["ST (SAO)", "MT (AGRIL)", "MT (Non-agrl)", "LT (if any)"],
        columns: [
          { key: "y1disbursed", label: "Y1 Disbursed", dynamicLabelKey: "c.yearLabels.y1" }, { key: "y1recovery", label: "Y1 Recovery", dynamicLabelKey: "c.yearLabels.y1" }, { key: "y1outstanding", label: "Y1 Outstanding", dynamicLabelKey: "c.yearLabels.y1" }, { key: "y1overdue", label: "Y1 Overdue", dynamicLabelKey: "c.yearLabels.y1" },
          { key: "y2disbursed", label: "Y2 Disbursed", dynamicLabelKey: "c.yearLabels.y2" }, { key: "y2recovery", label: "Y2 Recovery", dynamicLabelKey: "c.yearLabels.y2" }, { key: "y2outstanding", label: "Y2 Outstanding", dynamicLabelKey: "c.yearLabels.y2" }, { key: "y2overdue", label: "Y2 Overdue", dynamicLabelKey: "c.yearLabels.y2" },
          { key: "y3disbursed", label: "Y3 Disbursed", dynamicLabelKey: "c.yearLabels.y3" }, { key: "y3recovery", label: "Y3 Recovery", dynamicLabelKey: "c.yearLabels.y3" }, { key: "y3outstanding", label: "Y3 Outstanding", dynamicLabelKey: "c.yearLabels.y3" }, { key: "y3overdue", label: "Y3 Overdue", dynamicLabelKey: "c.yearLabels.y3" },
        ],
      },

      { type: "subheading", label: "হাতে নগদ (Cash in Hand — with denomination)" },
      {
        type: "cash-matrix", key: "c.cashInHand",
        rows: ["₹2000", "₹500", "₹200", "₹100", "₹50", "₹20", "₹10", "₹5", "Coins", "Total"],
        denomValues: [2000, 500, 200, 100, 50, 20, 10, 5, null, null],
        columns: [{ key: "number", label: "সংখ্যা (Number)" }, { key: "amount", label: "মোট পরিমাণ (Amount)" }],
      },

      { type: "subheading", label: "লাভ-ক্ষতির অবস্থা (Profit/Loss Position)" },
      {
        type: "dynamic-table", key: "c.profitLoss", addLabel: "বছর যোগ করুন (Add Year)",
        columns: [
          { key: "year", label: "বছর (Year)" }, { key: "grossPL", label: "Gross Profit/Loss" },
          { key: "netPL", label: "Net Profit/Loss" }, { key: "accumulatedPL", label: "Accumulated P/L" }, { key: "undistributed", label: "Undistributed Profit (if any)" },
        ],
      },
    ],
  },
  {
    key: "d", title: "ডিপোজিট সংগ্রহ ব্যবসা (Deposit Mobilized Business) — C.5",
    color: "#7A2E6B", colorSoft: "#F1E1EC", shortLabel: "D",
    fields: [
      {
        type: "select", key: "c.deposit.doesBusiness", rerenderOnChange: true,
        label: "সমিতিটি কি Deposit Mobilized Business করে? (Does the Society conduct Deposit Mobilized Business?)",
        options: ["হ্যাঁ (Yes)", "না (No)"],
      },

      { type: "text", key: "c.deposit.permissionObtained", label: "Financing Bank থেকে অনুমতি প্রাপ্ত হয়েছে কি? (Has permission been obtained from Financing Bank?)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      { type: "text", key: "c.deposit.memoNoDate", label: "Memo No. ও তারিখ (Memo No. & Date)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },

      { type: "subheading", label: "Deposit Liabilities of the Society (as on date of inspection)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      {
        type: "matrix-table-total", key: "c.deposit.liabilities",
        rows: DEPOSIT_LIABILITY_ROWS, totalRowLabel: "Total", autoColumns: ["totalAC", "totalAmount"],
        columns: [{ key: "totalAC", label: "মোট A/C সংখ্যা (Total No. of A/C)" }, { key: "totalAmount", label: "মোট পরিমাণ (Total Amount)" }],
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },

      { type: "subheading", label: "Investment of Deposit Mobilized Fund — At Bank", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      {
        type: "dynamic-table-total", key: "c.deposit.investmentBank", addLabel: "যোগ করুন (Add)",
        totalColumn: "amount", totalLabel: "মোট বিনিয়োগ (Total Investment)",
        columns: [
          { key: "bankName", label: "ব্যাংকের নাম (Name of Bank)" }, { key: "mode", label: "বিনিয়োগ পদ্ধতি (Mode of Investment)" },
          { key: "amount", label: "Amount of Deposit" }, { key: "maturityDate", label: "মেয়াদপূর্তি তারিখ (Maturity Date)" },
        ],
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },

      {
        type: "computed-percent", key: "c.deposit.liquidityPercent",
        label: "Total Deposit Liquidity Percentage (Investment ÷ Deposit Liabilities × 100)",
        numerator: { path: "c.deposit.investmentBank", column: "amount" },
        denominator: { path: "c.deposit.liabilities", rows: DEPOSIT_LIABILITY_ROWS, excludeRow: "Total", column: "totalAmount" },
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },

      { type: "subheading", label: "Deployment of Fund in Other Business", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      {
        type: "dynamic-table-total", key: "c.deposit.deploymentOther", addLabel: "যোগ করুন (Add)",
        totalColumn: "amountInvested", totalLabel: "মোট (Total)",
        columns: [{ key: "typeOfBusiness", label: "ব্যবসার ধরন (Type of Business)" }, { key: "amountInvested", label: "বিনিয়োগকৃত পরিমাণ (Amount Invested)" }],
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },

      { type: "subheading", label: "Issuance of Loan from Deposit Mobilized Fund", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      {
        type: "dynamic-table-total", key: "c.deposit.loanIssued", addLabel: "যোগ করুন (Add)",
        totalColumn: "amount", totalLabel: "মোট (Total)",
        columns: [
          { key: "typeOfLoan", label: "ঋণের ধরন (Type of Loan)" }, { key: "noOfPersons", label: "ব্যক্তি/গ্রুপ সংখ্যা (No. of Persons/Groups)" },
          { key: "amount", label: "পরিমাণ (Amount)" }, { key: "security", label: "জামানত (Security)" },
        ],
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },

      { type: "subheading", label: "Advance given from Deposit Mobilized Fund (if any)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      {
        type: "dynamic-table-total", key: "c.deposit.advance", addLabel: "যোগ করুন (Add)",
        totalColumn: "amountDisbursed", totalLabel: "মোট বিতরণ (Total Disbursed)",
        columns: [
          { key: "purpose", label: "উদ্দেশ্য (Purpose)" }, { key: "beneficiary", label: "সুবিধাভোগী (Beneficiary)" },
          { key: "bodDate", label: "BOD সভার তারিখ (Date of BOD Meeting)" }, { key: "disbursementDate", label: "বিতরণের তারিখ (Date of Disbursement)" },
          { key: "amountDisbursed", label: "বিতরণকৃত পরিমাণ (Amount Disbursed)" }, { key: "amountRecovered", label: "আদায়কৃত পরিমাণ (Amount Recovered)" },
        ],
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },

      { type: "subheading", label: "ডিপোজিট কেস স্টাডি (Deposit Case Study, with Interest)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      {
        type: "dynamic-table", key: "c.deposit.caseStudy", addLabel: "যোগ করুন (Add)",
        columns: [
          { key: "typeOfDeposit", label: "ডিপোজিটের ধরন (Type of Deposit)" }, { key: "accountHolder", label: "অ্যাকাউন্ট হোল্ডারের নাম (Name of Account Holder)" },
          { key: "amount", label: "পরিমাণ (Amount)" }, { key: "interest", label: "সুদ (Credited/Accrued)" }, { key: "maturityDate", label: "মেয়াদপূর্তি তারিখ (Maturity Date)" },
        ],
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },
      { type: "subheading", label: "সম্পদ তৈরিতে পাবলিক ডিপোজিট ব্যবহার (Use of Public Deposit for Asset Creation, if any)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      {
        type: "dynamic-table", key: "c.deposit.publicDepositForAsset", addLabel: "যোগ করুন (Add)",
        columns: [{ key: "amountInvolved", label: "সংশ্লিষ্ট পরিমাণ (Amount Involved)" }, { key: "assetCreated", label: "তৈরিকৃত সম্পদ (Asset Created)" }],
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },
      { type: "subheading", label: "ডিপোজিট থেকে ঋণের কেস স্টাডি (Case Study of Loan from Deposit)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      {
        type: "dynamic-table", key: "c.deposit.loanCaseStudy", addLabel: "যোগ করুন (Add)",
        columns: [
          { key: "typeOfLoan", label: "ঋণের ধরন (Type of Loan)" }, { key: "loaneeName", label: "ঋণগ্রহীতার নাম (Name of Loanee)" }, { key: "amount", label: "পরিমাণ (Amount)" },
          { key: "bodDate", label: "BOD সভার তারিখ (Date of BOD Meeting)" }, { key: "recovery", label: "আদায় (Recovery — Principal/Interest)" },
          { key: "security", label: "প্রাপ্ত জামানত (Security Obtained)" }, { key: "anomalies", label: "অসঙ্গতি (Anomalies, if any)" },
        ],
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },
      { type: "subheading", label: "পাবলিক ডিপোজিট অন্য খাতে ব্যবহার (Use of Public Deposit in Other Sector, if any)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      {
        type: "dynamic-table", key: "c.deposit.diversion", addLabel: "যোগ করুন (Add)",
        columns: [{ key: "amountInvolved", label: "পরিমাণ (Amount)" }, { key: "purpose", label: "উদ্দেশ্য (Purpose)" }],
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },
      { type: "text", key: "c.deposit.agentInvolved", label: "ডিপোজিট সংগ্রহে এজেন্ট জড়িত আছে কি? (Is any Agent involved in Deposit collection?)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      {
        type: "dynamic-table", key: "c.deposit.agents", addLabel: "এজেন্ট যোগ করুন (Add Agent)",
        columns: [
          { key: "name", label: "এজেন্টের নাম (Name of Agent)" }, { key: "address", label: "ঠিকানা ও ফোন নম্বর (Address & Phone Number)" },
          { key: "commission", label: "কমিশন (Savings/RD/TD/FD/Others/Loan collection)" },
        ],
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },
      { type: "text", key: "c.deposit.loanAgainstLimit", label: "নির্ধারিত সীমার বাইরে ঋণ প্রদানের ঘটনা (Instances of Loan given beyond prescribed limit, if any)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      { type: "text", key: "c.deposit.erosionOfFund", label: "তহবিল ক্ষয় (Erosion of Fund) শনাক্ত হয়েছে কি?", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      { type: "text", key: "c.deposit.erosionReason", label: "যদি হ্যাঁ হয়, কারণ (If Yes, reason)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      { type: "text", key: "c.deposit.defalcation", label: "তহবিল আত্মসাৎ (Defalcation), যদি থাকে", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },

      { type: "subheading", label: "ভল্ট (Vault)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      {
        type: "select", key: "c.deposit.hasVault", rerenderOnChange: true,
        label: "সমিতি Daily Cash বা Deposited Money রাখার জন্য কোনো Vault আছে কি না? (Does the Society have a Vault for Daily Cash / Deposited Money?)",
        options: ["হ্যাঁ (Yes)", "না (No)"],
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },
      {
        type: "select", key: "c.deposit.vaultFixed",
        label: "হ্যাঁ হলে, সেটি দেওয়াল বা মেঝের সাথে গ্রথিত আছে কি না? (If Yes, is it fixed to the wall or floor?)",
        options: ["হ্যাঁ (Yes)", "না (No)"],
        showIf: [
          { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
          { key: "c.deposit.hasVault", equals: "হ্যাঁ (Yes)" },
        ],
      },

      { type: "subheading", label: "Centrally Sponsored Software (CSS)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      {
        type: "select", key: "c.deposit.cssRegistered", rerenderOnChange: true,
        label: "সমিতি Centrally Sponsored Software-এর জন্য নথিভুক্ত হয়েছে? (Is the Society registered for Centrally Sponsored Software?)",
        options: ["হ্যাঁ (Yes)", "না (No)"],
        showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
      },
      {
        type: "select", key: "c.deposit.cssWorkingThrough", rerenderOnChange: true,
        label: "হ্যাঁ হলে, সমিতি কি এর মাধ্যমে কাজ করছে? (If Yes, is the Society working through it?)",
        options: ["হ্যাঁ (Yes)", "না (No)"],
        showIf: [
          { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
          { key: "c.deposit.cssRegistered", equals: "হ্যাঁ (Yes)" },
        ],
      },
      {
        type: "select", key: "c.deposit.cssAuditPossible",
        label: "হ্যাঁ হলে, সমিতি কি এই অর্থবর্ষে বা আগামী বর্ষে এর মাধ্যমে নিরীক্ষা সম্পন্ন করতে পারবে? (If Yes, will the audit be completed through it this or next financial year?)",
        options: ["হ্যাঁ (Yes)", "না (No)"],
        showIf: [
          { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" },
          { key: "c.deposit.cssRegistered", equals: "হ্যাঁ (Yes)" },
          { key: "c.deposit.cssWorkingThrough", equals: "হ্যাঁ (Yes)" },
        ],
      },
      { type: "number", key: "c.deposit.otherSoftwareCount", label: "সমিতি আর কতগুলি সফটওয়্যার ব্যবহার করে? (How many other software does the Society use?)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
      { type: "text", key: "c.deposit.otherSoftwareNames", label: "সেগুলির নাম কি? (What are their names?)", showIf: { key: "c.deposit.doesBusiness", equals: "হ্যাঁ (Yes)" } },
    ],
  },
  {
    key: "e", title: "E. আর্থিক বিশ্লেষণ (Financial Analysis)",
    color: "#0F766E", colorSoft: "#DAEEEC", shortLabel: "E",
    fields: [
      { type: "text", key: "e.slr", label: "SLR" },
      { type: "text", key: "e.loanGrowth", label: "Loan Growth" },
      { type: "text", key: "e.depositGrowth", label: "Deposit Growth" },
      { type: "text", key: "e.loanDepositRatio", label: "Loan/Deposit Ratio" },
      { type: "text", key: "e.nim", label: "Net Interest Margin" },
      { type: "text", key: "e.costIncomeRatio", label: "Cost to Income Ratio" },
      { type: "text", key: "e.crar", label: "CRAR (>9%)" },
      { type: "text", key: "e.liquidityRatio", label: "Liquidity Ratio (Current Asset/Current Liabilities >1)" },
    ],
  },
  {
    key: "f", title: "F. অন্যান্য প্রাসঙ্গিক বিষয় (Any Other Relevant Points)",
    color: "#B45309", colorSoft: "#F5E3D0", shortLabel: "F",
    fields: [
      { type: "number", key: "f.workingCapital", label: "1. Working Capital of the Society (as per last Audit Report)" },
      { type: "number", key: "f.salaryExpenditure", label: "2. Total Salary Expenditure by the Society (as per last Audit Report)" },

      { type: "subheading", label: "3. Establishment Cost of the Society (as per last Audit Report)" },
      { type: "number", key: "f.establishmentCostOtherThanSalary", label: "3.a. Establishment Cost (Other than Salary)" },
      { type: "number", key: "f.establishmentCostIncludingSalary", label: "3.b. Establishment Cost (including Salary)" },

      { type: "subheading", label: "4. Others Fund (as per last Audit Report)" },
      { type: "number", key: "f.reserveFund", label: "a. Reserve Fund" },
      { type: "number", key: "f.badDebtFund", label: "b. Bad Debt Fund" },
      { type: "number", key: "f.riskFund", label: "c. Risk Fund" },
      { type: "number", key: "f.coopEducationFund", label: "d. Cooperative Education Fund" },
      { type: "number", key: "f.gratuityFund", label: "e. Gratuity Fund" },
      { type: "text", key: "f.otherFundName", label: "f. Any Other Fund, specify (তহবিলের নাম)" },
      { type: "number", key: "f.otherFundAmount", label: "f. উক্ত তহবিলের পরিমাণ (Amount)" },

      { type: "subheading", label: "অন্যান্য (Additional Notes, if any)" },
      { type: "textarea", key: "f.otherPoints", label: "অন্য কোনো প্রাসঙ্গিক তথ্য থাকলে লিখুন (Write any other relevant information)", rows: 4 },
    ],
  },
  {
    key: "godown", title: "G. Godown / Cold Storage of the Society",
    color: "#9D174D", colorSoft: "#FBE4EC", shortLabel: "G",
    fields: [
      {
        type: "select", key: "godown.hasGodown", rerenderOnChange: true,
        label: "সমিতির কি Godown / Cold Storage আছে? (Godown / Cold Storage of the Society)",
        options: ["হ্যাঁ (Yes)", "না (No)"],
      },
      { type: "number", key: "godown.count", label: "7.a. কতগুলি Godown / Cold Storage আছে? (How many Godowns / Cold Storage)", showIf: { key: "godown.hasGodown", equals: "হ্যাঁ (Yes)" } },
      { type: "text", key: "godown.capacity", label: "7.b. মোট ধারণক্ষমতা (Total Storage Capacity of Godown / Cold Storage)", showIf: { key: "godown.hasGodown", equals: "হ্যাঁ (Yes)" } },
      {
        type: "select", key: "godown.ownHired", rerenderOnChange: true,
        label: "7.c. নিজস্ব / ভাড়া (Own / Hired)", options: ["নিজস্ব (Own)", "ভাড়া (Hired)"],
        showIf: { key: "godown.hasGodown", equals: "হ্যাঁ (Yes)" },
      },
      {
        type: "select", key: "godown.fundType", rerenderOnChange: true,
        label: "7.c.i. নিজস্ব তহবিল / সরকারি তহবিল (Own Fund / Govt Fund)",
        options: ["নিজস্ব তহবিল (Own Fund)", "সরকারি তহবিল (Govt Fund)"],
        showIf: [{ key: "godown.hasGodown", equals: "হ্যাঁ (Yes)" }, { key: "godown.ownHired", equals: "নিজস্ব (Own)" }],
      },
      {
        type: "dynamic-table", key: "godown.govtFundedGodowns", addLabel: "গোডাউন/স্কিম যোগ করুন (Add Godown/Scheme)",
        columns: [
          { key: "scheme", label: "কোন স্কিম (Which Scheme)" },
          { key: "aidAmount", label: "সরকারি সাহায্যের পরিমাণ (Govt Aid Amount)" },
          { key: "readyDate", label: "গোডাউন কবে প্রস্তুত হয়েছে? (When was the Godown ready?)" },
        ],
        showIf: [
          { key: "godown.hasGodown", equals: "হ্যাঁ (Yes)" },
          { key: "godown.ownHired", equals: "নিজস্ব (Own)" },
          { key: "godown.fundType", equals: "সরকারি তহবিল (Govt Fund)" },
        ],
      },
      {
        type: "number", key: "godown.ownFundAmount", label: "মোট বিনিয়োগকৃত পরিমাণ (Total Amount Involved)",
        showIf: [
          { key: "godown.hasGodown", equals: "হ্যাঁ (Yes)" },
          { key: "godown.ownHired", equals: "নিজস্ব (Own)" },
          { key: "godown.fundType", equals: "নিজস্ব তহবিল (Own Fund)" },
        ],
      },
    ],
  },
  {
    key: "govtscheme", title: "H. সরকারি প্রকল্প সংক্রান্ত তথ্য (Government Scheme)",
    color: "#7C3AED", colorSoft: "#EDE4FB", shortLabel: "H",
    fields: [
      { type: "subheading", label: "A. সরকারি প্রকল্প সংক্রান্ত প্রাথমিক তথ্য (Basic Information regarding Government Scheme)" },
      yn("h.hasScheme", "সমিতি কি কোনো সরকারি প্রকল্পে যুক্ত আছে, অথবা কোনো সরকারি প্রকল্পের জন্য নিজের নাম নথিভুক্ত করেছে? (Is the Society associated with any Government Scheme, or has it registered for one?)"),

      { type: "subheading", label: "নিম্নলিখিত কোন প্রকল্পে সমিতি নাম নথিভুক্ত করেছে / প্রকল্প পেয়েছে? (Which of the following schemes has the Society registered for / received? Multiple selection allowed)", showIf: GOVT_YES },
      { type: "checklist", key: "h.schemesSelected", label: "প্রকল্পসমূহ (Schemes)", options: GOVT_SCHEME_LIST, otherKey: "h.otherSchemeName", otherLabel: "Any Other Scheme (Please Mention)", showIf: GOVT_YES },

      { type: "subheading", label: "B. নির্বাচিত প্রকল্পের বিস্তারিত তথ্য (Details of Selected Scheme — প্রতিটি নির্বাচিত প্রকল্পের জন্য আলাদা)", showIf: GOVT_YES },
      { type: "scheme-detail-repeat", key: "h.schemeDetails", showIf: GOVT_YES },

      { type: "subheading", label: "C. প্রতিবন্ধকতা / সমস্যা (Obstacles / Problems)", showIf: GOVT_YES },
      yn("h.hasObstacle", "প্রকল্প বাস্তবায়নের ক্ষেত্রে সমিতি কি কোনো বাধা/সমস্যার সম্মুখীন হচ্ছে? (Is the Society facing any obstacle/problem in implementing the scheme?)", GOVT_YES),
      { type: "textarea", key: "h.obstacleDescription", label: "বাধা/সমস্যার সংক্ষিপ্ত বিবরণ (Brief description of the obstacle/problem)", rows: 3, showIf: [GOVT_YES, { key: "h.hasObstacle", equals: "হ্যাঁ (Yes)" }] },

      { type: "subheading", label: "D. প্রয়োজনীয় নথিপত্র (Required Documents)", showIf: GOVT_YES },
      { type: "checklist", key: "h.requiredDocs", label: "প্রকল্পটি পাওয়ার/বাস্তবায়নের জন্য সমিতির কী কী কাগজপত্র/নথি প্রয়োজন হয়েছে? (What documents were required to obtain/implement the scheme?)", options: GOVT_REQUIRED_DOCS, otherKey: "h.requiredDocsOther", otherLabel: "অন্যান্য (Others, please specify)", showIf: GOVT_YES },
      { type: "textarea", key: "h.specialRemarks", label: "বিশেষ মন্তব্য/অন্যান্য তথ্য (Special remarks / Other information)", rows: 3, showIf: GOVT_YES },
    ],
  },
  {
    key: "training", title: "I. প্রশিক্ষণ (Training)",
    color: "#B45309", colorSoft: "#FBEAD3", shortLabel: "I",
    fields: [
      {
        type: "checklist", key: "training.types",
        label: "সমিতিতে কোন কোন ধরনের প্রশিক্ষণ/সচেতনতা শিবির হয়েছে? (Which type(s) of Training/Awareness Camp has taken place? Multiple selection allowed)",
        options: TRAINING_TYPES,
      },

      { type: "subheading", label: "কর্মচারী প্রশিক্ষণ (Employee Training)", showIf: { key: "training.types", includes: "কর্মচারী প্রশিক্ষণ (Employee Training)" } },
      {
        type: "dynamic-table", key: "training.employee", addLabel: "যোগ করুন (Add)", autoSerial: true,
        columns: TRAINING_EMPLOYEE_COLUMNS,
        showIf: { key: "training.types", includes: "কর্মচারী প্রশিক্ষণ (Employee Training)" },
      },

      { type: "subheading", label: "SHG প্রশিক্ষণ/সচেতনতা শিবির (SHG Training/Awareness Camp)", showIf: { key: "training.types", includes: "SHG প্রশিক্ষণ/সচেতনতা শিবির (SHG Training/Awareness Camp)" } },
      {
        type: "dynamic-table", key: "training.shg", addLabel: "যোগ করুন (Add)", autoSerial: true,
        columns: TRAINING_SHG_COLUMNS,
        showIf: { key: "training.types", includes: "SHG প্রশিক্ষণ/সচেতনতা শিবির (SHG Training/Awareness Camp)" },
      },

      { type: "subheading", label: "Members Training / Awareness Camp", showIf: { key: "training.types", includes: "Members Training / Awareness Camp" } },
      {
        type: "dynamic-table", key: "training.members", addLabel: "যোগ করুন (Add)", autoSerial: true,
        columns: TRAINING_GENERIC_COLUMNS,
        showIf: { key: "training.types", includes: "Members Training / Awareness Camp" },
      },

      { type: "subheading", label: "BOD Training / Awareness Camp", showIf: { key: "training.types", includes: "BOD Training / Awareness Camp" } },
      {
        type: "dynamic-table", key: "training.bod", addLabel: "যোগ করুন (Add)", autoSerial: true,
        columns: TRAINING_GENERIC_COLUMNS,
        showIf: { key: "training.types", includes: "BOD Training / Awareness Camp" },
      },

      { type: "subheading", label: "Farmers Training / Awareness Camp", showIf: { key: "training.types", includes: "Farmers Training / Awareness Camp" } },
      {
        type: "dynamic-table", key: "training.farmers", addLabel: "যোগ করুন (Add)", autoSerial: true,
        columns: TRAINING_GENERIC_COLUMNS,
        showIf: { key: "training.types", includes: "Farmers Training / Awareness Camp" },
      },

      { type: "subheading", label: "Technical Training by Bank/Govt/Software Company to the Societies", showIf: { key: "training.types", includes: "Technical Training by Bank/Govt/Software Company to the Societies" } },
      {
        type: "dynamic-table", key: "training.technical", addLabel: "যোগ করুন (Add)", autoSerial: true,
        columns: TRAINING_TECHNICAL_COLUMNS,
        showIf: { key: "training.types", includes: "Technical Training by Bank/Govt/Software Company to the Societies" },
      },

      { type: "subheading", label: "Any Other(s)", showIf: { key: "training.types", includes: "Any other(s)" } },
      { type: "text", key: "training.other.programmeName", label: "Training Programme / Awareness Camp Name", showIf: { key: "training.types", includes: "Any other(s)" } },
      { type: "text", key: "training.other.deptName", label: "Department Name", showIf: { key: "training.types", includes: "Any other(s)" } },
      {
        type: "dynamic-table", key: "training.other.entries", addLabel: "যোগ করুন (Add)", autoSerial: true,
        columns: TRAINING_OTHER_COLUMNS,
        showIf: { key: "training.types", includes: "Any other(s)" },
      },
    ],
  },
  {
    key: "fps", title: "J. রেশন দোকান পরিদর্শন (Fair Price Shop)",
    color: "#0E7490", colorSoft: "#DCF0F3", shortLabel: "J",
    fields: [
      yn("i.hasFPS", "সমিতির রেশন ব্যবসা / Fair Price Shop আছে? (Does the Society have a Ration business / Fair Price Shop?)"),

      { type: "subheading", label: "A. দোকান ও ডিলারের প্রাথমিক তথ্য (Basic Information of Shop & Dealer)", showIf: FPS_YES },
      { type: "text", key: "i.shopName", label: "রেশন দোকানের নাম (Name of the Ration Shop)", showIf: FPS_YES },
      { type: "text", key: "i.licenceNo", label: "FPS / Licence No.", showIf: FPS_YES },
      { type: "text", key: "i.dealerName", label: "রেশন ডিলারের নাম (Name of the Ration Dealer)", showIf: FPS_YES },
      { type: "text", key: "i.mobile", label: "মোবাইল নম্বর (Mobile Number)", showIf: FPS_YES },
      { type: "textarea", key: "i.address", label: "দোকানের সম্পূর্ণ ঠিকানা (Full Address of the Shop)", rows: 2, showIf: FPS_YES },
      { type: "select", key: "i.localBody", label: "দোকানটি কোন স্থানীয় সংস্থার এলাকায়? (Under which Local Body does the shop fall?)", options: ["Gram Panchayat", "Municipality", "Municipal Corporation", "অন্যান্য (Other)"], rerenderOnChange: true, showIf: FPS_YES },
      { type: "text", key: "i.localBodyOtherName", label: "অন্যান্য হলে, নাম উল্লেখ করুন (If Other, please specify)", showIf: [FPS_YES, { key: "i.localBody", equals: "অন্যান্য (Other)" }] },

      { type: "subheading", label: "B. দোকানের কার্যক্রম (Shop Operations)", showIf: FPS_YES },
      yn("i.shopOpen", "রেশন দোকানটি বর্তমানে চালু আছে? (Is the Ration Shop currently open?)", FPS_YES),
      { type: "checklist", key: "i.closedReason", label: "দোকান বন্ধ থাকার কারণ (Reason for shop being closed)", options: FPS_CLOSED_REASONS, otherKey: "i.closedReasonOther", otherLabel: "অন্যান্য কারণ (Other reason, if any)", showIf: [FPS_YES, { key: "i.shopOpen", equals: "না (No)" }] },
      yn("i.regularHours", "দোকানটি নিয়মিত নির্ধারিত দিনে/সময়ে খোলা হয়? (Does the shop open regularly on fixed days/hours?)", FPS_YES),
      yn("i.hoursDisplayed", "দোকানের নির্ধারিত Opening Hours প্রদর্শিত আছে? (Are the shop's Opening Hours displayed?)", FPS_YES),
      yn("i.noticeBoardDisplayed", "দোকানে Notice Board প্রদর্শিত আছে? (Is a Notice Board displayed at the shop?)", FPS_YES),
      yn("i.noticeBoardUpdated", "Notice Board-এ প্রয়োজনীয় তথ্য/নির্দেশিকা হালনাগাদ করা হয়েছে? (Is the required information/instructions on the Notice Board up-to-date?)", FPS_YES),

      { type: "subheading", label: "C. Stock সংক্রান্ত তথ্য (Information regarding Stock)", showIf: FPS_YES },
      yn("i.adequateStock", "বর্তমানে দোকানে রেশন সামগ্রীর পর্যাপ্ত Stock রয়েছে? (Is there adequate Stock of ration items at the shop currently?)", FPS_YES),
      yn("i.stockRegisterMaintained", "Stock Register যথাযথভাবে সংরক্ষিত হচ্ছে? (Is the Stock Register properly maintained?)", FPS_YES),
      yn("i.registerMatchesPhysical", "Register-এর Stock এবং Physical Stock-এর মধ্যে মিল রয়েছে? (Does the Register Stock match the Physical Stock?)", FPS_YES),
      { type: "textarea", key: "i.stockMismatchDesc", label: "Stock-এর অমিলের সংক্ষিপ্ত বিবরণ (Brief description of the Stock discrepancy)", rows: 3, showIf: [FPS_YES, { key: "i.registerMatchesPhysical", equals: "না (No)" }] },
      yn("i.stockUpdatedRegularly", "দোকানে Stock-এর সঠিক হিসাব নিয়মিত Update করা হয়? (Is the Stock account regularly and correctly updated?)", FPS_YES),
      yn("i.receivedDistributedRecordsKept", "দোকানে প্রাপ্ত এবং বিতরণকৃত খাদ্যশস্যের হিসাব সংরক্ষিত আছে? (Is an account kept of foodgrain received and distributed?)", FPS_YES),

      { type: "subheading", label: "D. Distribution সংক্রান্ত তথ্য (Information regarding Distribution)", showIf: FPS_YES },
      yn("i.regularDistribution", "Beneficiary-দের মধ্যে নিয়মিত রেশন বিতরণ করা হচ্ছে? (Is ration being distributed to Beneficiaries regularly?)", FPS_YES),
      yn("i.eposWorking", "e-POS Machine কার্যকর অবস্থায় আছে? (Is the e-POS Machine functional?)", FPS_YES),
      { type: "textarea", key: "i.eposProblemDesc", label: "e-POS Machine-এর সমস্যার বিবরণ (Description of the e-POS Machine problem)", rows: 3, showIf: [FPS_YES, { key: "i.eposWorking", equals: "না (No)" }] },
      yn("i.biometricDistribution", "Beneficiary-দের biometric authentication/e-POS-এর মাধ্যমে বিতরণ করা হচ্ছে? (Is distribution done through biometric authentication/e-POS?)", FPS_YES),
      yn("i.correctQuantityGiven", "Beneficiary-কে প্রাপ্য পরিমাণ অনুযায়ী খাদ্যশস্য দেওয়া হচ্ছে? (Are Beneficiaries given foodgrain as per their due quantity?)", FPS_YES),
      yn("i.receiptGiven", "Beneficiary-কে transaction receipt/slip প্রদান করা হচ্ছে? (Is a transaction receipt/slip given to Beneficiaries?)", FPS_YES),
      yn("i.fixedPriceDistribution", "নির্ধারিত মূল্যে খাদ্যশস্য বিতরণ করা হচ্ছে? (Is foodgrain distributed at the fixed price?)", FPS_YES),

      { type: "subheading", label: "E. দোকানের পরিকাঠামো ও সংরক্ষণ ব্যবস্থা (Shop Infrastructure & Storage Arrangement)", showIf: FPS_YES },
      yn("i.adequateStorageSpace", "খাদ্যশস্য সংরক্ষণের জন্য পর্যাপ্ত জায়গা রয়েছে? (Is there adequate space for storing foodgrain?)", FPS_YES),
      yn("i.stockCleanSafe", "দোকানের Stock পরিষ্কার ও নিরাপদভাবে সংরক্ষিত হচ্ছে? (Is the shop's Stock stored clean and safely?)", FPS_YES),
      yn("i.grainProperHeight", "খাদ্যশস্য মেঝে থেকে যথাযথ উচ্চতায় রাখা হয়েছে? (Is foodgrain kept at a proper height from the floor?)", FPS_YES),
      yn("i.adequateLightVentilation", "দোকানে পর্যাপ্ত আলো ও বায়ু চলাচলের ব্যবস্থা রয়েছে? (Is there adequate light and ventilation in the shop?)", FPS_YES),
      yn("i.fireSafety", "দোকানে অগ্নিনিরাপত্তা/Fire Safety-এর উপযুক্ত ব্যবস্থা রয়েছে? (Is there adequate Fire Safety arrangement at the shop?)", FPS_YES),
      yn("i.weighingMachineFunctional", "ওজন মাপার যন্ত্র (Weighing Machine) কার্যকর অবস্থায় আছে? (Is the Weighing Machine functional?)", FPS_YES),
      yn("i.weighingMachineCorrectUse", "ওজন মাপার যন্ত্রটি সঠিকভাবে কাজ করছে/যথাযথভাবে ব্যবহৃত হচ্ছে? (Is the Weighing Machine working correctly / used properly?)", FPS_YES),

      { type: "subheading", label: "F. নথিপত্র ও রেজিস্টার (Documents & Registers) — নিম্নলিখিত নথি/রেজিস্টারগুলি দোকানে পাওয়া গেল কি? (Were the following documents/registers found at the shop?)", showIf: FPS_YES },
      ...fpsDocRow("licence", "Licence/Authorisation"),
      ...fpsDocRow("stockReg", "Stock Register"),
      ...fpsDocRow("distReg", "Distribution/Sales Register"),
      ...fpsDocRow("inspectionReg", "Inspection Register/Book"),
      ...fpsDocRow("otherReg", "অন্যান্য নির্ধারিত Register (Other Prescribed Register)"),
      { type: "select", key: "i.pastInstructionsFollowed", label: "পূর্ববর্তী Inspection-এর নির্দেশ/পরামর্শগুলি পালন করা হয়েছে? (Have the instructions/advice from the previous Inspection been followed?)", options: ["হ্যাঁ (Yes)", "না (No)", "প্রযোজ্য নয় (Not Applicable)"], rerenderOnChange: true, showIf: FPS_YES },
      { type: "textarea", key: "i.pastInstructionsNotFollowedDesc", label: "কোন কোন নির্দেশ পালন করা হয়নি? (Which instructions were not followed?)", rows: 3, showIf: [FPS_YES, { key: "i.pastInstructionsFollowed", equals: "না (No)" }] },

      { type: "subheading", label: "G. Beneficiary Service (সুবিধাভোগী পরিষেবা)", showIf: FPS_YES },
      yn("i.complaintMechanism", "Beneficiary-দের অভিযোগ জানানোর ব্যবস্থা আছে? (Is there a mechanism for Beneficiaries to lodge complaints?)", FPS_YES),
      yn("i.complaintInfoDisplayed", "Complaint/Grievance সংক্রান্ত তথ্য দোকানে প্রদর্শিত আছে? (Is Complaint/Grievance related information displayed at the shop?)", FPS_YES),
      yn("i.dealerBehaviorSatisfactory", "Beneficiary-দের সঙ্গে ডিলারের আচরণ সন্তোষজনক? (Is the Dealer's behaviour towards Beneficiaries satisfactory?)", FPS_YES),
      yn("i.irregularityFound", "রেশন বিতরণে কোনও অনিয়ম/অভিযোগ পাওয়া গেছে? (Was any irregularity/complaint found in ration distribution?)", FPS_YES),
      { type: "textarea", key: "i.irregularityDesc", label: "অভিযোগ/অনিয়মের সংক্ষিপ্ত বিবরণ (Brief description of the complaint/irregularity)", rows: 3, showIf: [FPS_YES, { key: "i.irregularityFound", equals: "হ্যাঁ (Yes)" }] },

      { type: "subheading", label: "H. Digital / Online System (ডিজিটাল/অনলাইন ব্যবস্থা)", showIf: FPS_YES },
      yn("i.eposRegularlyUsed", "e-POS/Online system নিয়মিত ব্যবহার করা হচ্ছে? (Is the e-POS/Online system used regularly?)", FPS_YES),
      yn("i.internetProblem", "Internet/Network সংক্রান্ত সমস্যা হচ্ছে? (Is there any Internet/Network related problem?)", FPS_YES),
      { type: "textarea", key: "i.internetProblemDesc", label: "সমস্যার সংক্ষিপ্ত বিবরণ (Brief description of the problem)", rows: 3, showIf: [FPS_YES, { key: "i.internetProblem", equals: "হ্যাঁ (Yes)" }] },
      yn("i.electricityProblem", "Electricity/Power supply সংক্রান্ত সমস্যা রয়েছে? (Is there any Electricity/Power supply related problem?)", FPS_YES),

      { type: "subheading", label: "I. অন্যান্য সরকারি প্রকল্প / অতিরিক্ত কার্যক্রম (Other Government Schemes / Additional Activities)", showIf: FPS_YES },
      yn("i.linkedToOtherScheme", "রেশন দোকানটি কি কোনও অতিরিক্ত সরকারি প্রকল্প/কার্যক্রমের সঙ্গে যুক্ত হয়েছে? (Is the Ration Shop linked with any additional Government scheme/activity?)", FPS_YES),
      { type: "text", key: "i.otherSchemeNameFPS", label: "হ্যাঁ হলে প্রকল্পের নাম (If Yes, name of the scheme)", showIf: [FPS_YES, { key: "i.linkedToOtherScheme", equals: "হ্যাঁ (Yes)" }] },
      yn("i.diversification", "রেশন দোকানটি কি অন্য কোনও পণ্য/সেবা প্রদানের মাধ্যমে Diversification করেছে? (Has the Ration Shop diversified into any other product/service?)", FPS_YES),
      { type: "textarea", key: "i.diversificationDesc", label: "হ্যাঁ হলে বিবরণ (If Yes, details)", rows: 2, showIf: [FPS_YES, { key: "i.diversification", equals: "হ্যাঁ (Yes)" }] },

      { type: "subheading", label: "J. সমস্যা ও প্রতিবন্ধকতা (Problems & Obstacles)", showIf: FPS_YES },
      yn("i.majorProblem", "রেশন দোকান পরিচালনার ক্ষেত্রে কোনও প্রধান সমস্যা/বাধা রয়েছে? (Is there any major problem/obstacle in running the Ration Shop?)", FPS_YES),
      { type: "checklist", key: "i.problemTypes", label: "সমস্যার ধরন (Type of Problem)", options: FPS_PROBLEM_TYPES, otherKey: "i.problemTypesOther", otherLabel: "অন্যান্য (Others, please specify)", showIf: [FPS_YES, { key: "i.majorProblem", equals: "হ্যাঁ (Yes)" }] },
      { type: "textarea", key: "i.problemDesc", label: "সমস্যার সংক্ষিপ্ত বিবরণ (Brief description of the problem)", rows: 3, showIf: [FPS_YES, { key: "i.majorProblem", equals: "হ্যাঁ (Yes)" }] },

      { type: "subheading", label: "K. Inspection-এর Final Assessment (চূড়ান্ত মূল্যায়ন)", showIf: FPS_YES },
      yn("i.seriousIrregularity", "পরিদর্শনের সময় কোনও গুরুতর অনিয়ম লক্ষ্য করা গেছে? (Was any serious irregularity noticed during inspection?)", FPS_YES),
      { type: "textarea", key: "i.seriousIrregularityDesc", label: "হ্যাঁ হলে সংক্ষিপ্ত বিবরণ (If Yes, brief description)", rows: 3, showIf: [FPS_YES, { key: "i.seriousIrregularity", equals: "হ্যাঁ (Yes)" }] },
      yn("i.immediateInstructionGiven", "ডিলারকে কোনও তাৎক্ষণিক নির্দেশ/পরামর্শ প্রদান করা হয়েছে? (Was any immediate instruction/advice given to the Dealer?)", FPS_YES),
      yn("i.higherAuthorityInterventionNeeded", "ঊর্ধ্বতন কর্তৃপক্ষের হস্তক্ষেপ/প্রয়োজনীয় ব্যবস্থা প্রয়োজন? (Is intervention/action from a higher authority needed?)", FPS_YES),
      { type: "textarea", key: "i.higherAuthorityInterventionDesc", label: "হ্যাঁ হলে কী বিষয়ে (If Yes, on what matter)", rows: 2, showIf: [FPS_YES, { key: "i.higherAuthorityInterventionNeeded", equals: "হ্যাঁ (Yes)" }] },

      { type: "subheading", label: "শেষ ধাপ (Final Step)", showIf: FPS_YES },
      { type: "textarea", key: "i.inspectorRemarks", label: "Inspector-এর বিশেষ মন্তব্য (Inspector's Special Remarks)", rows: 4, showIf: FPS_YES },
      { type: "select", key: "i.followUpNeeded", label: "পরবর্তী Inspection/Follow-up প্রয়োজন? (Is a follow-up Inspection needed?)", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: FPS_YES },
    ],
  },
  {
    key: "housing", title: "K. Housing Co-operative Societies Inspection",
    color: "#0891B2", colorSoft: "#D9F0F4", shortLabel: "K",
    fields: [
      yn("housing.isHousing", "এটি কি একটি Housing Co-operative Society-র Inspection? (Is this an inspection of a Housing Co-operative Society?)"),

      { type: "subheading", label: "১. মৌলিক তথ্য (Basic Information) — সমিতির বিবরণ", showIf: HOUSING_YES },
      { type: "linked-field", label: "Name of the Society", sourceKey: "a.name", showIf: HOUSING_YES },
      { type: "linked-field", label: "Registration No. & Date", sourceKey: "a.regNoDate", showIf: HOUSING_YES },
      { type: "linked-field", label: "Registered Address", sourceKey: "a.address", showIf: HOUSING_YES },
      { type: "linked-field", label: "Functional Area", sourceKey: "a.operationalArea", showIf: HOUSING_YES },
      {
        type: "select", key: "housing.type", label: "৬. Type of Housing Co-operative",
        options: [
          "Type–A: Separate plots / individual houses",
          "Type–B: Consolidated land / flats",
          "Type–C: Existing flats / maintenance society",
        ],
        showIf: HOUSING_YES,
      },

      { type: "subheading", label: "২. নথিভুক্তি ও উপ-বিধি (Registration & Bye-laws)", showIf: HOUSING_YES },
      yn("housing.reg.byelawsAvailable", "৭. Registered Bye-laws available?", HOUSING_YES),
      { type: "textarea", key: "housing.reg.byelawsNotAvailableReason", label: "Observation / Reason (No হলে)", rows: 2, showIf: [HOUSING_YES, { key: "housing.reg.byelawsAvailable", equals: "না (No)" }] },
      yn("housing.reg.byelawsAmended", "৮. Bye-laws amended after registration?", HOUSING_YES),
      { type: "text", key: "housing.reg.byelawsAmendedDetails", label: "তারিখ ও অনুমোদনের বিবরণ (Date & approval details)", showIf: [HOUSING_YES, { key: "housing.reg.byelawsAmended", equals: "হ্যাঁ (Yes)" }] },
      { type: "select", key: "housing.reg.functioningPerByelaws", label: "৯. সমিতি কি নথিভুক্ত উপ-বিধি অনুসারে পরিচালিত হচ্ছে? (Society functioning according to registered Bye-laws?)", options: ["হ্যাঁ (Yes)", "না (No)", "আংশিক (Partially)"], showIf: HOUSING_YES },

      { type: "subheading", label: "৩. সদস্যপদ পরিদর্শন (Membership Inspection)", showIf: HOUSING_YES },
      yn("housing.mem.registerUpdated", "১০. Membership Register updated?", HOUSING_YES),
      yn("housing.mem.eligibilityVerified", "১১. Sample members-এর eligibility verified?", HOUSING_YES),
      yn("housing.mem.declarationSubmitted", "১২. Member has submitted required declaration?", HOUSING_YES),
      yn("housing.mem.memberOfAnotherSociety", "১৩. Member is member of another Housing Co-operative Society?", HOUSING_YES),
      yn("housing.mem.ownsAnotherProperty", "১৪. Member/family owns another relevant residential property?", HOUSING_YES),
      yn("housing.mem.genuineNeedVerified", "১৫. Genuine housing requirement verified?", HOUSING_YES),
      yn("housing.mem.docsAvailable", "১৬. Required documents available?", HOUSING_YES),
      {
        type: "checklist", key: "housing.mem.docsChecklist", label: "Documents checklist",
        options: ["Declaration/Affidavit", "Photograph", "Salary Certificate/Form 16", "PAN-related document", "Professional Tax document, where applicable", "PPO, where applicable"],
        otherKey: "housing.mem.docsChecklistOther", otherLabel: "Other prescribed documents",
        showIf: [HOUSING_YES, { key: "housing.mem.docsAvailable", equals: "হ্যাঁ (Yes)" }],
      },
      { type: "textarea", key: "housing.mem.redFlagDetails", label: "🚨 RED FLAG — Details of suspected ineligible membership", rows: 3, showIf: [HOUSING_YES, { key: "housing.mem.eligibilityVerified", equals: "না (No)" }] },
      {
        type: "photo-capture", key: "housing.mem.redFlagPhotos", maxPhotos: 2,
        categories: ["সদস্য সংক্রান্ত প্রমাণ (Membership Evidence)", "অন্যান্য (Other)"],
        showIf: [HOUSING_YES, { key: "housing.mem.eligibilityVerified", equals: "না (No)" }],
      },
      { type: "textarea", key: "housing.mem.redFlagObservation", label: "Observation", rows: 2, showIf: [HOUSING_YES, { key: "housing.mem.eligibilityVerified", equals: "না (No)" }] },

      { type: "subheading", label: "৪. জমি ও প্রকল্প (Land & Project)", showIf: HOUSING_YES },
      yn("housing.land.docsValid", "১৭. Society has valid land-related documents?", HOUSING_YES),
      {
        type: "checklist", key: "housing.land.docsChecklist", label: "নথির তালিকা",
        options: ["Deed", "Mutation", "Khatian/ROR", "Dag/Plot details", "Possession document"],
        otherKey: "housing.land.docsChecklistOther", otherLabel: "Other",
        showIf: [HOUSING_YES, { key: "housing.land.docsValid", equals: "হ্যাঁ (Yes)" }],
      },
      { type: "select", key: "housing.land.purchasedInSocietyName", label: "১৮. Land purchased in the name of Society?", options: ["হ্যাঁ (Yes)", "না (No)", "প্রযোজ্য নয় (Not applicable)"], showIf: HOUSING_YES },
      yn("housing.land.approvedProjectAvailable", "১৯. Approved project/scheme available?", HOUSING_YES),
      { type: "number", key: "housing.land.approvedUnits", label: "২০. Approved number of units", showIf: HOUSING_YES },
      { type: "number", key: "housing.land.presentUnits", label: "২১. Present number of units", showIf: HOUSING_YES },
      {
        type: "select", key: "housing.land.projectStatus", rerenderOnChange: true,
        label: "২২. Project completed?", options: ["হ্যাঁ (Yes)", "না (No)", "নির্মাণাধীন (Under construction)"],
        showIf: HOUSING_YES,
      },
      { type: "number", key: "housing.land.physicalProgress", label: "Physical progress (%)", showIf: HOUSING_UNDER_CONSTRUCTION },
      { type: "text", key: "housing.land.estimatedCompletion", label: "Estimated completion (days/months)", showIf: HOUSING_UNDER_CONSTRUCTION },

      { type: "subheading", label: "৫. বরাদ্দ (Allotment)", showIf: HOUSING_YES },
      yn("housing.allot.registerMaintained", "২৩. Plot/flat allotment register maintained?", HOUSING_YES),
      yn("housing.allot.boardResolutionSupported", "২৪. Allotment supported by Board resolution?", HOUSING_YES),
      yn("housing.allot.perApprovedPolicy", "২৫. Allotment made according to approved policy?", HOUSING_YES),
      yn("housing.allot.multipleUnit", "২৬. Any member allotted more than one unit?", HOUSING_YES),
      { type: "textarea", key: "housing.allot.multipleUnitDetails", label: "বিবরণ (Details)", rows: 2, showIf: [HOUSING_YES, { key: "housing.allot.multipleUnit", equals: "হ্যাঁ (Yes)" }] },
      yn("housing.allot.letterIssued", "২৭. Allotment letter issued?", HOUSING_YES),

      { type: "subheading", label: "৬. বোর্ড ও ব্যবস্থাপনা (Board & Management)", showIf: HOUSING_YES },
      yn("housing.board.validlyConstituted", "২৮. Present Board validly constituted?", HOUSING_YES),
      yn("housing.board.meetingsRegular", "২৯. Board meetings held regularly?", HOUSING_YES),
      yn("housing.board.minutesMaintained", "৩০. Minutes Book properly maintained?", HOUSING_YES),
      yn("housing.board.expenditureResolution", "৩১. Decisions relating to project expenditure supported by Board resolution?", HOUSING_YES),
      { type: "select", key: "housing.board.contractorAppointedProperly", label: "৩২. Contractor/Architect/Engineer/Valuer appointed properly?", options: ["হ্যাঁ (Yes)", "না (No)", "প্রযোজ্য নয় (Not applicable)"], showIf: HOUSING_YES },

      { type: "subheading", label: "৭. আর্থিক ও হিসাব (Finance & Accounts)", showIf: HOUSING_YES },
      yn("housing.fin.cashBookUpdated", "৩৩. Cash Book updated?", HOUSING_YES),
      yn("housing.fin.bankReconciliation", "৩৪. Bank reconciliation regularly prepared?", HOUSING_YES),
      yn("housing.fin.duesRegisterMaintained", "৩৫. Member-wise dues register maintained?", HOUSING_YES),
      yn("housing.fin.contributionPerDemand", "৩৬. Member contribution received according to demand?", HOUSING_YES),
      yn("housing.fin.contractorPaymentsSupported", "৩৭. Contractor payments supported by bills/vouchers?", HOUSING_YES),
      yn("housing.fin.expenditureRecordsProper", "৩৮. Project expenditure supported by proper records?", HOUSING_YES),
      yn("housing.fin.outstandingDues", "৩৯. Any major outstanding member dues?", HOUSING_YES),
      { type: "number", key: "housing.fin.outstandingDuesAmount", label: "পরিমাণ (Amount ₹)", showIf: [HOUSING_YES, { key: "housing.fin.outstandingDues", equals: "হ্যাঁ (Yes)" }] },

      { type: "subheading", label: "৮. নির্মাণ / প্রকল্পের অগ্রগতি (Construction / Project Progress) — শুধু নির্মাণাধীন সমিতির ক্ষেত্রে", showIf: HOUSING_UNDER_CONSTRUCTION },
      { type: "select", key: "housing.constr.started", rerenderOnChange: true, label: "৪০. Construction started?", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: HOUSING_UNDER_CONSTRUCTION },
      { type: "number", key: "housing.constr.physicalProgress", label: "Physical progress (%)", showIf: [...HOUSING_UNDER_CONSTRUCTION, { key: "housing.constr.started", equals: "হ্যাঁ (Yes)" }] },
      { type: "select", key: "housing.constr.perApprovedPlan", label: "৪১. Construction according to approved plan?", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: HOUSING_UNDER_CONSTRUCTION },
      { type: "select", key: "housing.constr.contractorProperProcedure", label: "৪২. Contractor appointed through proper procedure?", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: HOUSING_UNDER_CONSTRUCTION },
      { type: "select", key: "housing.constr.architectEngaged", label: "৪৩. Architect/Engineer engaged?", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: HOUSING_UNDER_CONSTRUCTION },
      { type: "select", key: "housing.constr.costRevised", rerenderOnChange: true, label: "৪৪. Project cost revised?", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: HOUSING_UNDER_CONSTRUCTION },
      { type: "number", key: "housing.constr.originalCost", label: "Original Cost (₹)", showIf: [...HOUSING_UNDER_CONSTRUCTION, { key: "housing.constr.costRevised", equals: "হ্যাঁ (Yes)" }] },
      { type: "number", key: "housing.constr.revisedCost", label: "Revised Cost (₹)", showIf: [...HOUSING_UNDER_CONSTRUCTION, { key: "housing.constr.costRevised", equals: "হ্যাঁ (Yes)" }] },
      { type: "select", key: "housing.constr.escalationApproved", label: "৪৫. Cost escalation properly placed before competent body?", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: HOUSING_UNDER_CONSTRUCTION },

      { type: "subheading", label: "৯. হস্তান্তর / ভাড়া (Transfer / Letting)", showIf: HOUSING_YES },
      yn("housing.transfer.anyTransfer", "৪৬. Any plot/flat transferred after allotment?", HOUSING_YES),
      { type: "text", key: "housing.transfer.memberName", label: "Member name", showIf: [HOUSING_YES, { key: "housing.transfer.anyTransfer", equals: "হ্যাঁ (Yes)" }] },
      { type: "text", key: "housing.transfer.unitNo", label: "Unit No.", showIf: [HOUSING_YES, { key: "housing.transfer.anyTransfer", equals: "হ্যাঁ (Yes)" }] },
      { type: "date", key: "housing.transfer.date", label: "Transfer date", showIf: [HOUSING_YES, { key: "housing.transfer.anyTransfer", equals: "হ্যাঁ (Yes)" }] },
      { type: "select", key: "housing.transfer.societyApproval", rerenderOnChange: true, label: "Society approval", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: [HOUSING_YES, { key: "housing.transfer.anyTransfer", equals: "হ্যাঁ (Yes)" }] },
      { type: "select", key: "housing.transfer.deedAvailable", label: "Transfer deed", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: [HOUSING_YES, { key: "housing.transfer.anyTransfer", equals: "হ্যাঁ (Yes)" }] },
      { type: "select", key: "housing.transfer.newMemberAdmitted", label: "New member admission", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: [HOUSING_YES, { key: "housing.transfer.anyTransfer", equals: "হ্যাঁ (Yes)" }] },
      yn("housing.transfer.priorConsent", "৪৭. Society's prior written consent obtained?", HOUSING_YES),
      yn("housing.transfer.anyLetOut", "৪৮. Any flat/house let out?", HOUSING_YES),
      { type: "select", key: "housing.transfer.letOutPermission", rerenderOnChange: true, label: "৪৯. Prior permission of Society obtained?", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: [HOUSING_YES, { key: "housing.transfer.anyLetOut", equals: "হ্যাঁ (Yes)" }] },

      { type: "subheading", label: "১০. সাধারণ এলাকা ও সুবিধা (Common Areas & Facilities)", showIf: HOUSING_YES },
      { type: "select", key: "housing.common.maintained", rerenderOnChange: true, label: "৫০. Common facilities properly maintained?", options: ["হ্যাঁ (Yes)", "না (No)", "আংশিক (Partially)"], showIf: HOUSING_YES },
      {
        type: "checklist", key: "housing.common.facilitiesChecklist", label: "সুবিধার তালিকা",
        options: ["Road", "Drainage", "Water Supply", "Electricity", "Lift", "Staircase", "Roof", "Boundary Wall", "Parking", "Garden", "Playground", "Security", "Generator", "Fire Fighting", "Water Tank"],
        otherKey: "housing.common.facilitiesOther", otherLabel: "Other",
        showIf: HOUSING_YES,
      },
      yn("housing.common.costApportioned", "৫১. Maintenance cost properly apportioned?", HOUSING_YES),

      { type: "subheading", label: "১১. AGM / সংবিধিবদ্ধ সম্মতি (AGM / Statutory Compliance)", showIf: HOUSING_YES },
      yn("housing.agm.held", "৫২. Last AGM held?", HOUSING_YES),
      { type: "date", key: "housing.agm.date", label: "Date", showIf: [HOUSING_YES, { key: "housing.agm.held", equals: "হ্যাঁ (Yes)" }] },
      { type: "number", key: "housing.agm.membersPresent", label: "Members present", showIf: [HOUSING_YES, { key: "housing.agm.held", equals: "হ্যাঁ (Yes)" }] },
      { type: "select", key: "housing.agm.minutesAvailable", label: "Minutes available", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: [HOUSING_YES, { key: "housing.agm.held", equals: "হ্যাঁ (Yes)" }] },
      { type: "select", key: "housing.agm.annualReport", label: "Annual report", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: [HOUSING_YES, { key: "housing.agm.held", equals: "হ্যাঁ (Yes)" }] },
      { type: "select", key: "housing.agm.projectReport", label: "Project report", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: [HOUSING_YES, { key: "housing.agm.held", equals: "হ্যাঁ (Yes)" }] },
      { type: "select", key: "housing.agm.financialStatement", label: "Financial statement", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: [HOUSING_YES, { key: "housing.agm.held", equals: "হ্যাঁ (Yes)" }] },
      { type: "select", key: "housing.agm.auditReport", label: "Audit report", options: ["হ্যাঁ (Yes)", "না (No)"], showIf: [HOUSING_YES, { key: "housing.agm.held", equals: "হ্যাঁ (Yes)" }] },
      { type: "select", key: "housing.agm.previousResolutionsComplied", label: "৫৩. Previous AGM resolutions complied with?", options: ["হ্যাঁ (Yes)", "না (No)", "আংশিক (Partially)"], showIf: HOUSING_YES },
      yn("housing.agm.statutoryReturnsSubmitted", "৫৪. Statutory returns submitted?", HOUSING_YES),

      { type: "subheading", label: "১২. নিরীক্ষা ও পূর্ববর্তী পরিদর্শন (Audit & Previous Inspection)", showIf: HOUSING_YES },
      yn("housing.audit.completed", "৫৫. Latest statutory audit completed?", HOUSING_YES),
      { type: "text", key: "housing.audit.year", label: "Audit Year", showIf: HOUSING_YES },
      yn("housing.audit.objectionsExist", "৫৬. Audit objections exist?", HOUSING_YES),
      {
        type: "dynamic-table", key: "housing.audit.objections", addLabel: "আপত্তি যোগ করুন (Add Objection)",
        columns: [{ key: "objection", label: "Outstanding Audit Objection" }],
        showIf: [HOUSING_YES, { key: "housing.audit.objectionsExist", equals: "হ্যাঁ (Yes)" }],
      },
      yn("housing.audit.complianceSubmitted", "৫৭. Audit compliance submitted?", HOUSING_YES),
      yn("housing.audit.prevReportAvailable", "৫৮. Previous Inspection Report available?", HOUSING_YES),
      { type: "select", key: "housing.audit.prevObservationsComplied", rerenderOnChange: true, label: "৫৯. Previous inspection observations complied with?", options: ["হ্যাঁ (Yes)", "না (No)", "আংশিক (Partially)"], showIf: HOUSING_YES },

      { type: "subheading", label: "১৩. ইরেগুলারিটি / রেড ফ্ল্যাগ (Irregularity / Red Flag) — পূর্ববর্তী উত্তর থেকে স্বয়ংক্রিয়ভাবে তৈরি", showIf: HOUSING_YES },
      { type: "redflag-summary", key: "housing.redFlagSummary", showIf: HOUSING_YES },
    ],
  },
  {
    key: "g", title: "L. পর্যবেক্ষণ (Observations)",
    color: "#475569", colorSoft: "#E3E7EC", shortLabel: "L",
    fields: [
      {
        type: "textarea", key: "g.observations", rows: 6, renderAsNumberedList: true,
        label: "সার্বিক পর্যবেক্ষণ লিখুন (Write overall observations — one point per line; it will appear as a numbered list 1, 2, 3... in the report)",
      },

      { type: "subheading", label: "সামাজিক / এলাকা উন্নয়নমূলক কার্যক্রম (Social / Area Development Activities)" },
      { type: "text", key: "g.devWork.financialYear", label: "আর্থিক বছর নির্বাচন করুন (Select Financial Year)" },
      yn("g.devWork.done", "শেষ আর্থিক বর্ষে বা চলতি আর্থিক বর্ষে সমিতি কোনো সামাজিক বা এলাকার উন্নয়নমূলক কাজ করেছে কি? (যেমন: কৃতি ছাত্রদের সম্বর্ধনা, বৃক্ষরোপণ, রক্তদান কর্মসূচি প্রভৃতি)"),
      {
        type: "dynamic-table", key: "g.devWork.activities", addLabel: "কার্যক্রম যোগ করুন (Add Activity)",
        columns: [
          { key: "description", label: "কী কাজ করা হয়েছে (Description of Work)" },
          { key: "approxCost", label: "Approximate কত খরচ হয়েছে (Approximate Cost, ₹)" },
        ],
        showIf: { key: "g.devWork.done", equals: "হ্যাঁ (Yes)" },
      },
    ],
  },
];
