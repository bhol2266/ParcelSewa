// Aramex Nepal (run by All Expoexpress Service Nepal Pvt Ltd), shown on /trackOrder once we've handed an order to
// them. Offices and numbers are from aramex.com/np/en/find-aramex-office (checked 5 Nov 2026).

export const ARAMEX_TRACK_URL = "https://www.aramex.com/ae/en/track/shipments";
export const ARAMEX_LABEL_IMAGE = "/tracking/aramex-tracking-number.webp";

export type AramexOffice = { place: string; area: string; phone: string; tel: string; hours: string };

export const ARAMEX_OFFICES: AramexOffice[] = [
    { place: "Kathmandu (head office)", area: "Tinkune, near the air cargo complex", phone: "01-5970223", tel: "+97715970223", hours: "Sun–Fri, 9:00 AM – 6:00 PM" },
    { place: "Kathmandu, New Road", area: "Bhula Marg, Ganabahal", phone: "01-4112200", tel: "+97714112200", hours: "Sun–Fri, 9:30 AM – 6:00 PM" },
    { place: "Kathmandu, Pepsicola", area: "Suryamukhi Chowk", phone: "982-5439520", tel: "+9779825439520", hours: "Sun–Fri, 10:00 AM – 6:00 PM" },
    { place: "Thankot", area: "Satungal Complex, Chandragiri", phone: "985-1214654", tel: "+9779851214654", hours: "Sun–Fri, 10:00 AM – 6:00 PM" },
    { place: "Pokhara", area: "New Road, Pokhara, Kaski", phone: "01-5970223", tel: "+97715970223", hours: "Sun–Fri, 10:00 AM – 6:00 PM" },
    { place: "Bardibas", area: "Main Road", phone: "980-1603515", tel: "+9779801603515", hours: "Sun–Fri, 9:30 AM – 6:00 PM" },
    { place: "Nepalgunj", area: "Dhambaji Chowk", phone: "01-5970223", tel: "+97715970223", hours: "Sun–Fri, 10:00 AM – 6:00 PM" },
    { place: "Dhangadhi", area: "Kailali Pul", phone: "01-5970223", tel: "+97715970223", hours: "Sun–Fri, 10:00 AM – 6:00 PM" },
];
