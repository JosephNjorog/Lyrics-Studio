export type TemplateType = "image" | "video";

export interface Template {
  id: string;
  userId: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  type: TemplateType;
  tags: string[];
  createdAt: Date;
}

export interface CreateTemplateInput {
  name: string;
  imageUrl: string;
  thumbnailUrl?: string;
  type?: TemplateType;
  tags?: string[];
}

/** Text style configuration for a render */
export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  baseColor: string;      // inactive word color (hex)
  highlightColor: string; // active word color (hex)
  highlightStyle: "color" | "underline" | "scale" | "glow";
  textAlign: "left" | "center" | "right";
  lineSpacing: number;
  padding: { top: number; bottom: number; left: number; right: number };
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Inter",
  fontSize: 48,
  baseColor: "#AAAAAA",
  highlightColor: "#FFFFFF",
  highlightStyle: "color",
  textAlign: "center",
  lineSpacing: 1.6,
  padding: { top: 60, bottom: 60, left: 80, right: 80 },
};
