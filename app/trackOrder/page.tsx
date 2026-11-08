import { cookies } from "next/headers";
import TrackOrderPage from "@/components/TrackOrderPage";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-access";

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
  // The team (admin cookie) tracks with the number only, without the payment amount.
  const admin = (await cookies()).get(ADMIN_COOKIE)?.value === ADMIN_PASSWORD;
  return <TrackOrderPage initialMobile={typeof params.mobile === "string" ? params.mobile : ""} admin={admin} />;
};

export default Page;
