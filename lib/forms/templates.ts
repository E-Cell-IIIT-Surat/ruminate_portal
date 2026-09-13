export type BuilderField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  hideFromReviewers?: boolean;
  description?: string;
  helpText?: string;
  placeholder?: string;
  options?: string[];
  allowedFileTypes: string[];
  maxFileSizeBytes?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
  minNumber?: number | null;
  maxNumber?: number | null;
  conditionFieldKey?: string | null;
  conditionOperator?: "==" | "!=" | null;
  conditionValue?: unknown;
};
export type BuilderSection = { title: string; description?: string; fields: BuilderField[] };

export const templates: Record<string, BuilderSection[]> = {
  "Basic registration": [
    {
      title: "Personal details",
      fields: ["Name", "Email", "Phone", "College", "Year"].map((label) => ({
        key: label.toLowerCase().replace(" ", "_"),
        label,
        type: label === "Email" ? "EMAIL" : label === "Phone" ? "PHONE" : "SHORT_TEXT",
        required: true,
        allowedFileTypes: [],
      })),
    },
  ],
  Workshop: [
    {
      title: "Personal information",
      fields: ["Name", "Email", "College"].map((label) => ({
        key: label.toLowerCase(),
        label,
        type: label === "Email" ? "EMAIL" : "SHORT_TEXT",
        required: true,
        allowedFileTypes: [],
      })),
    },
    {
      title: "Background",
      fields: [
        { key: "experience", label: "Relevant experience", type: "LONG_TEXT", required: false, allowedFileTypes: [] },
        {
          key: "motivation",
          label: "Why do you want to attend?",
          type: "LONG_TEXT",
          required: true,
          allowedFileTypes: [],
        },
      ],
    },
  ],
  "Industry visit": [
    {
      title: "Registration",
      fields: [
        { key: "full_name", label: "Full name", type: "SHORT_TEXT", required: true, allowedFileTypes: [] },
        { key: "email", label: "Email", type: "EMAIL", required: true, allowedFileTypes: [] },
        { key: "phone", label: "Phone", type: "PHONE", required: true, allowedFileTypes: [] },
        { key: "student_id", label: "Student ID", type: "SHORT_TEXT", required: true, allowedFileTypes: [] },
        {
          key: "emergency_contact",
          label: "Emergency contact",
          type: "PHONE",
          required: true,
          allowedFileTypes: [],
        },
        {
          key: "visit_consent",
          label: "I agree to the visit rules",
          type: "CONSENT",
          required: true,
          allowedFileTypes: [],
        },
      ],
    },
  ],
  "Startup competition": [
    {
      title: "Startup",
      fields: [
        { key: "startup_name", label: "Startup name", type: "SHORT_TEXT", required: true, allowedFileTypes: [] },
        { key: "problem", label: "Problem", type: "LONG_TEXT", required: true, allowedFileTypes: [] },
        { key: "solution", label: "Solution", type: "LONG_TEXT", required: true, allowedFileTypes: [] },
        { key: "target_market", label: "Target market", type: "LONG_TEXT", required: true, allowedFileTypes: [] },
        {
          key: "pitch_deck",
          label: "Pitch deck",
          type: "FILE",
          required: true,
          allowedFileTypes: ["application/pdf"],
          maxFileSizeBytes: 10485760,
        },
      ],
    },
  ],
  "SSIP application": [
    {
      title: "Proposal",
      fields: [
        {
          key: "problem_statement",
          label: "Problem statement",
          type: "LONG_TEXT",
          required: true,
          allowedFileTypes: [],
        },
        { key: "innovation", label: "Innovation", type: "LONG_TEXT", required: true, allowedFileTypes: [] },
        {
          key: "technical_approach",
          label: "Technical approach",
          type: "LONG_TEXT",
          required: true,
          allowedFileTypes: [],
        },
        {
          key: "implementation_plan",
          label: "Implementation plan",
          type: "LONG_TEXT",
          required: true,
          allowedFileTypes: [],
        },
        { key: "budget", label: "Budget", type: "NUMBER", required: true, allowedFileTypes: [] },
        {
          key: "proposal_document",
          label: "Proposal document",
          type: "FILE",
          required: true,
          allowedFileTypes: ["application/pdf"],
          maxFileSizeBytes: 10485760,
        },
      ],
    },
  ],
};

templates["KTB / Pitch event"] = [
  ...structuredClone(templates["Basic registration"]),
  {
    title: "Your business idea",
    fields: [
      { key: "business_name", label: "Business / team name", type: "SHORT_TEXT", required: true, allowedFileTypes: [] },
      {
        key: "business_overview",
        label: "What problem does your business solve?",
        type: "LONG_TEXT",
        required: true,
        allowedFileTypes: [],
      },
      {
        key: "proposal",
        label: "Business proposal (PDF or DOCX)",
        type: "FILE",
        required: true,
        allowedFileTypes: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        maxFileSizeBytes: 10485760,
      },
    ],
  },
];
templates.Hackathon = [
  ...structuredClone(templates["Basic registration"]),
  {
    title: "Project",
    fields: [
      { key: "project_name", label: "Project name", type: "SHORT_TEXT", required: true, allowedFileTypes: [] },
      {
        key: "project_idea",
        label: "Project idea and technology",
        type: "LONG_TEXT",
        required: true,
        allowedFileTypes: [],
      },
    ],
  },
];
