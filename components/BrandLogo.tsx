import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  surface?: "theme" | "dark";
};

export default function BrandLogo({
  className = "",
  surface = "theme",
}: BrandLogoProps) {
  return (
    <span className={`inline-grid align-middle ${className}`}>
      {surface === "theme" && (
        <Image
          src="/logo-light.png"
          alt="ParcelSewa.com"
          width={2170}
          height={725}
          className="col-start-1 row-start-1 h-auto w-full dark:hidden"
          priority
        />
      )}
      <Image
        src="/logo-dark.png"
        alt="ParcelSewa.com"
        width={2170}
        height={725}
        className={`col-start-1 row-start-1 h-auto w-full ${surface === "theme" ? "hidden dark:block" : ""}`}
      />
    </span>
  );
}
