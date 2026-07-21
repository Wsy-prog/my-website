import configData from "../../config.json";

export interface SiteConfig {
  site: {
    name: string;
    title: string;
    description: string;
    url: string;
    language: string;
    darkMode: string;
  };
  profile: {
    name: string;
    nameEn: string;
    avatar: string;
    bio: string;
    bioEn: string;
  };
  background: {
    type: "image" | "video" | "aurora" | "none";
    src: string;
    blur: number;
    overlayOpacity: number;
    enableParticles: boolean;
    enableAurora: boolean;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
  };
  contact: {
    email: string;
    social: Record<string, string>;
  };
}

export const siteConfig = configData as SiteConfig;
