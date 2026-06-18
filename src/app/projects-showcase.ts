export type ClientProject = {
  client: string;
  location: string;
  useCase: string;
  description: string;
};

export const clientProjectsShowcase = {
  eyebrow: "Built on Google Sheets & AppSheet",
  title: "Real MSME deliveries across India and beyond",
  lead:
    "Owner-led businesses run daily operations on Sheetomatic  -  from HSE dashboards to order-to-delivery and field staff tracking.",
} as const;

export const clientProjects: ClientProject[] = [
  {
    client: "Altasnim",
    location: "Oman",
    useCase: "Oil & Gas  -  HSE Dashboard",
    description:
      "Real-time HSE violations, penalties, and performance across cluster locations.",
  },
  {
    client: "Hotchand Tolaram",
    location: "Dubai, UAE",
    useCase: "Inventory Management",
    description:
      "Stock control and movement tracking on Google Sheets and AppSheet.",
  },
  {
    client: "Pawar Constructions",
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
    client: "Poultry Farm",
    location: "India",
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
    location: "Mumbai",
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
];
