export type ClientProject = {
  client: string;
  location: string;
  useCase: string;
  description: string;
};

export const clientProjectsShowcase = {
  eyebrow: "Our work",
  title: "Real MSME operations we have built and run",
  lead:
    "Construction, trading, logistics, retail, real estate, and field teams - flow, stock, CRM, checklists, and WhatsApp AI in one workspace.",
} as const;

/** Highlight diverse industries on the homepage grid. */
export const featuredClientProjects: ClientProject[] = [
  {
    client: "PPCPL (Pawar Patkar Constructions Private Limited)",
    location: "Pune",
    useCase: "Vendor source to contract",
    description:
      "Work orders, material issues, and transfers from vendor onboarding through site delivery.",
  },
  {
    client: "Borade Poultry Farm",
    location: "Mumbai",
    useCase: "Egg supply chain",
    description: "Procurement, stock, and dispatch on mobile across the supply chain.",
  },
  {
    client: "Kavlin Struc",
    location: "Dhamtari",
    useCase: "Prefab and PEB building",
    description:
      "CRM with validation workflows and quotation systems for prefab and PEB project sales.",
  },
  {
    client: "Altasnim",
    location: "Oman",
    useCase: "Oil and gas HSE dashboard",
    description: "Real-time HSE violations, penalties, and performance across clusters.",
  },
  {
    client: "1000+ clients",
    location: "India",
    useCase: "WhatsApp Business API",
    description:
      "Official API, templates, team inbox, and workflow integrations at scale.",
  },
];

export const clientProjects: ClientProject[] = [
  {
    client: "Altasnim",
    location: "Oman",
    useCase: "Oil & Gas  -  HSE Dashboard",
    description:
      "Real-time HSE violations, penalties, and performance across cluster locations.",
  },
  {
    client: "PPCPL (Pawar Patkar Constructions Private Limited)",
    location: "Pune",
    useCase: "Vendor Source to Contract",
    description:
      "Work orders, material issues, and transfers from vendor onboarding through site delivery.",
  },
  {
    client: "DNM Flora",
    location: "India",
    useCase: "Steel Bar Trading",
    description: "Sales to dispatch  -  quotes, orders, and dispatch coordination in one flow.",
  },
  {
    client: "MPCC",
    location: "Dehradun",
    useCase: "Medical Waste Collection & Recycling",
    description:
      "Sales to collection, attendance, and field staff tracking for collection routes.",
  },
  {
    client: "Uma INC",
    location: "Hong Kong",
    useCase: "Multi-department Apps",
    description:
      "Apps across departments  -  HR through import and export operations.",
  },
  {
    client: "Borade Poultry Farm",
    location: "Mumbai",
    useCase: "Egg Supply Chain",
    description: "Egg purchase to delivery  -  procurement, stock, and dispatch on mobile.",
  },
  {
    client: "ELVO Logistic",
    location: "Delhi",
    useCase: "Courier & Logistics",
    description: "Booking to delivery with integrated CRM for customer follow-up.",
  },
  {
    client: "Satya Advertisers",
    location: "Delhi",
    useCase: "Bag Manufacturing",
    description: "Jewellery carry bag orders  -  production planning and dispatch tracking.",
  },
  {
    client: "Lillybell",
    location: "Delhi",
    useCase: "Garment Retail",
    description: "Order management from purchase through inventory and sales.",
  },
  {
    client: "Fly High Fly Safe",
    location: "Bangalore",
    useCase: "Tour & Travel",
    description: "CRM and invoicing management for bookings, payments, and client follow-up.",
  },
  {
    client: "Nita Sales (Oppo)",
    location: "Gujarat",
    useCase: "Mobile Distribution",
    description: "Order to delivery with real-time inventory across distributor networks.",
  },
  {
    client: "1000+ Clients",
    location: "India",
    useCase: "WhatsApp API",
    description:
      "Official WhatsApp Business API, templates, team inbox, and workflow integrations at scale.",
  },
  {
    client: "100+ Clients",
    location: "India",
    useCase: "Attendance & Leave Management",
    description:
      "Mobile attendance, leave requests, and manager approvals deployed at scale.",
  },
  {
    client: "VITAS",
    location: "Bangalore",
    useCase: "CRM & Field Staff Tracking",
    description: "Customer pipeline and live field team location and visit tracking.",
  },
  {
    client: "SRI VISUAL FX",
    location: "Hyderabad",
    useCase: "Video Production",
    description:
      "Order to delivery for wedding, pre-wedding, anniversary, and birthday video projects.",
  },
  {
    client: "Kavlin Struc",
    location: "Dhamtari",
    useCase: "Prefab / PEB Building",
    description:
      "CRM with validation workflows and quotation systems for prefab and PEB project sales.",
  },
  {
    client: "Shanti Honda",
    location: "Raigarh",
    useCase: "Daily Reporting Dashboard",
    description: "Daily sales, service, and outlet performance reporting for dealership ops.",
  },
  {
    client: "Shanti Industries",
    location: "Raipur",
    useCase: "CRM & Inventory",
    description: "Customer pipeline linked to stock movement and order fulfilment in Workspace.",
  },
];
