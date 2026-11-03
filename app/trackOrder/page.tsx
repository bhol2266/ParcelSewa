import TrackOrderPage from "@/components/TrackOrderPage";

// app/trackOrder/page.tsx (Server Component)
export const metadata = {
  title: "Track Your Order | ParcelSewa",
  description: "Track your ParcelSewa order from India to your door in Nepal. Enter your mobile number to see live tracking and your previous orders.",
  openGraph: {
    title: "Track Your Order | ParcelSewa",
    description: "Track your ParcelSewa order from India to your door in Nepal.",
    url: "https://www.parcelsewa.com/trackOrder",
    images: [{ url: "/logo.png" }],
  },
};

const Page = async ({ searchParams }: { searchParams: Promise<{ mobile?: string | string[] }> }) => {
  const params = await searchParams;
  return <TrackOrderPage initialMobile={typeof params.mobile === "string" ? params.mobile : ""} />;
};

export default Page;
