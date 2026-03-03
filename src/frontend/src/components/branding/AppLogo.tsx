import { BRANDING } from "../../lib/branding";

interface AppLogoProps {
  className?: string;
}

export default function AppLogo({ className = "h-10 w-10" }: AppLogoProps) {
  return (
    <img src={BRANDING.logoUrl} alt={BRANDING.logoAlt} className={className} />
  );
}
