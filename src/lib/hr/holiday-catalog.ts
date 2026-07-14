export type HolidayRegion = "national" | "north" | "south" | "east" | "west";

export type HolidayCatalogItem = {
  id: string;
  name: string;
  date: Date;
  isOptional: boolean;
  region: HolidayRegion | "all";
};

export const MAX_HOLIDAYS_PER_YEAR = 10;

export const HOLIDAY_REGIONS: Array<{
  id: HolidayRegion;
  label: string;
  description: string;
}> = [
  {
    id: "national",
    label: "National standard",
    description: "Core India-wide public holidays plus common optional festivals.",
  },
  {
    id: "north",
    label: "North India",
    description: "National holidays with Holi, Raksha Bandhan, Diwali, and Gurpurab.",
  },
  {
    id: "south",
    label: "South India",
    description: "National holidays with Pongal, Ugadi/Vishu, Onam, and Diwali.",
  },
  {
    id: "east",
    label: "East India",
    description: "National holidays with Durga Puja, Kali Puja/Diwali, and regional new year.",
  },
  {
    id: "west",
    label: "West India",
    description: "National holidays with Gudi Padwa, Maharashtra/Gujarat Day, Ganesh Chaturthi, and Diwali.",
  },
];

function utcDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));
}

const variableHolidayDates: Record<
  number,
  Partial<Record<string, [number, number]>>
> = {
  2026: {
    holi: [2, 4],
    goodFriday: [3, 3],
    eidFitr: [2, 20],
    buddhaPurnima: [4, 1],
    eidAdha: [4, 27],
    rakshaBandhan: [7, 28],
    janmashtami: [8, 4],
    onam: [7, 26],
    ganeshChaturthi: [8, 14],
    durgaPuja: [9, 19],
    dussehra: [9, 20],
    diwali: [10, 8],
    chhath: [10, 15],
    guruNanak: [10, 24],
  },
  2027: {
    holi: [2, 22],
    goodFriday: [2, 26],
    eidFitr: [2, 10],
    buddhaPurnima: [4, 20],
    eidAdha: [4, 17],
    rakshaBandhan: [7, 17],
    janmashtami: [7, 25],
    onam: [7, 15],
    ganeshChaturthi: [8, 3],
    durgaPuja: [9, 8],
    dussehra: [9, 9],
    diwali: [9, 29],
    chhath: [10, 5],
    guruNanak: [10, 14],
  },
};

function variableDate(year: number, key: string, fallback: [number, number]) {
  const [monthIndex, day] = variableHolidayDates[year]?.[key] ?? fallback;
  return utcDate(year, monthIndex, day);
}

function coreNational(year: number): HolidayCatalogItem[] {
  return [
    {
      id: "republic-day",
      name: "Republic Day",
      date: utcDate(year, 0, 26),
      isOptional: false,
      region: "all",
    },
    {
      id: "independence-day",
      name: "Independence Day",
      date: utcDate(year, 7, 15),
      isOptional: false,
      region: "all",
    },
    {
      id: "gandhi-jayanti",
      name: "Gandhi Jayanti",
      date: utcDate(year, 9, 2),
      isOptional: false,
      region: "all",
    },
    {
      id: "diwali",
      name: "Diwali",
      date: variableDate(year, "diwali", [10, 1]),
      isOptional: false,
      region: "all",
    },
    {
      id: "christmas",
      name: "Christmas",
      date: utcDate(year, 11, 25),
      isOptional: false,
      region: "all",
    },
  ];
}

const regionOptionalFactories: Record<
  HolidayRegion,
  (year: number) => HolidayCatalogItem[]
> = {
  national: (year) => [
    {
      id: "holi",
      name: "Holi",
      date: variableDate(year, "holi", [2, 14]),
      isOptional: true,
      region: "national",
    },
    {
      id: "good-friday",
      name: "Good Friday",
      date: variableDate(year, "goodFriday", [3, 10]),
      isOptional: true,
      region: "national",
    },
    {
      id: "eid-ul-fitr",
      name: "Eid-ul-Fitr",
      date: variableDate(year, "eidFitr", [2, 31]),
      isOptional: true,
      region: "national",
    },
    {
      id: "dussehra",
      name: "Dussehra",
      date: variableDate(year, "dussehra", [9, 12]),
      isOptional: true,
      region: "national",
    },
    {
      id: "guru-nanak-jayanti",
      name: "Guru Nanak Jayanti",
      date: variableDate(year, "guruNanak", [10, 5]),
      isOptional: true,
      region: "national",
    },
  ],
  north: (year) => [
    {
      id: "holi",
      name: "Holi",
      date: variableDate(year, "holi", [2, 14]),
      isOptional: true,
      region: "north",
    },
    {
      id: "raksha-bandhan",
      name: "Raksha Bandhan",
      date: variableDate(year, "rakshaBandhan", [7, 15]),
      isOptional: true,
      region: "north",
    },
    {
      id: "janmashtami",
      name: "Janmashtami",
      date: variableDate(year, "janmashtami", [7, 25]),
      isOptional: true,
      region: "north",
    },
    {
      id: "dussehra",
      name: "Dussehra",
      date: variableDate(year, "dussehra", [9, 12]),
      isOptional: true,
      region: "north",
    },
    {
      id: "guru-nanak-jayanti",
      name: "Guru Nanak Jayanti",
      date: variableDate(year, "guruNanak", [10, 5]),
      isOptional: true,
      region: "north",
    },
  ],
  south: (year) => [
    {
      id: "pongal",
      name: "Pongal / Makar Sankranti",
      date: utcDate(year, 0, 14),
      isOptional: true,
      region: "south",
    },
    {
      id: "ugadi-vishu",
      name: "Ugadi / Vishu",
      date: utcDate(year, 3, 14),
      isOptional: true,
      region: "south",
    },
    {
      id: "eid-ul-fitr",
      name: "Eid-ul-Fitr",
      date: variableDate(year, "eidFitr", [2, 31]),
      isOptional: true,
      region: "south",
    },
    {
      id: "onam",
      name: "Onam",
      date: variableDate(year, "onam", [7, 26]),
      isOptional: true,
      region: "south",
    },
    {
      id: "dussehra",
      name: "Dussehra",
      date: variableDate(year, "dussehra", [9, 12]),
      isOptional: true,
      region: "south",
    },
  ],
  east: (year) => [
    {
      id: "bengali-new-year",
      name: "Bengali/Odia/Assamese New Year",
      date: utcDate(year, 3, 15),
      isOptional: true,
      region: "east",
    },
    {
      id: "buddha-purnima",
      name: "Buddha Purnima",
      date: variableDate(year, "buddhaPurnima", [4, 12]),
      isOptional: true,
      region: "east",
    },
    {
      id: "durga-puja",
      name: "Durga Puja / Maha Navami",
      date: variableDate(year, "durgaPuja", [9, 10]),
      isOptional: true,
      region: "east",
    },
    {
      id: "dussehra",
      name: "Vijaya Dashami",
      date: variableDate(year, "dussehra", [9, 12]),
      isOptional: true,
      region: "east",
    },
    {
      id: "chhath-puja",
      name: "Chhath Puja",
      date: variableDate(year, "chhath", [10, 8]),
      isOptional: true,
      region: "east",
    },
  ],
  west: (year) => [
    {
      id: "gudi-padwa",
      name: "Gudi Padwa",
      date: utcDate(year, 2, 19),
      isOptional: true,
      region: "west",
    },
    {
      id: "maharashtra-gujarat-day",
      name: "Maharashtra / Gujarat Day",
      date: utcDate(year, 4, 1),
      isOptional: true,
      region: "west",
    },
    {
      id: "eid-ul-fitr",
      name: "Eid-ul-Fitr",
      date: variableDate(year, "eidFitr", [2, 31]),
      isOptional: true,
      region: "west",
    },
    {
      id: "ganesh-chaturthi",
      name: "Ganesh Chaturthi",
      date: variableDate(year, "ganeshChaturthi", [8, 7]),
      isOptional: true,
      region: "west",
    },
    {
      id: "dussehra",
      name: "Dussehra",
      date: variableDate(year, "dussehra", [9, 12]),
      isOptional: true,
      region: "west",
    },
  ],
};

export function getHolidayCatalog(
  year: number,
  region: HolidayRegion,
): HolidayCatalogItem[] {
  return [...coreNational(year), ...regionOptionalFactories[region](year)]
    .slice(0, MAX_HOLIDAYS_PER_YEAR)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function isHolidayRegion(value: string): value is HolidayRegion {
  return HOLIDAY_REGIONS.some((region) => region.id === value);
}
