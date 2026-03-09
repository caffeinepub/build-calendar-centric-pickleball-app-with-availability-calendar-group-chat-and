import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Snowflake,
  Sun,
} from "lucide-react";
import type { DayWeather } from "../../services/weatherService";

interface WeatherIconProps {
  condition: DayWeather["condition"];
  size?: number;
}

export function WeatherIcon({ condition, size = 12 }: WeatherIconProps) {
  const style = { width: size, height: size };
  switch (condition) {
    case "clear":
      return <Sun className="text-yellow-400 flex-shrink-0" style={style} />;
    case "cloudy":
      return (
        <Cloud className="text-muted-foreground flex-shrink-0" style={style} />
      );
    case "overcast":
      return <Cloud className="text-slate-500 flex-shrink-0" style={style} />;
    case "rain":
      return (
        <CloudRain className="text-blue-400 flex-shrink-0" style={style} />
      );
    case "drizzle":
      return (
        <CloudRain className="text-blue-300 flex-shrink-0" style={style} />
      );
    case "storm":
      return (
        <CloudLightning
          className="text-purple-400 flex-shrink-0"
          style={style}
        />
      );
    case "snow":
      return <Snowflake className="text-sky-300 flex-shrink-0" style={style} />;
    case "fog":
      return (
        <CloudFog
          className="text-muted-foreground flex-shrink-0"
          style={style}
        />
      );
    default:
      return (
        <Cloud className="text-muted-foreground flex-shrink-0" style={style} />
      );
  }
}
