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
        <img
          src="/logo-light.webp"
          alt="ParcelSewa.com"
          width={640}
          height={214}
          className="col-start-1 row-start-1 h-auto w-full dark:hidden"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      )}
      <img
        src="/logo-dark.webp"
        alt="ParcelSewa.com"
        width={640}
        height={214}
        loading={surface === "theme" ? "eager" : "lazy"}
        decoding="async"
        className={`col-start-1 row-start-1 h-auto w-full ${surface === "theme" ? "hidden dark:block" : ""}`}
      />
    </span>
  );
}
