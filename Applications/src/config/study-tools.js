const TOOL_THEMES = [
  {
    accentColor: "#2563eb",
    gradient: "linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)",
    bgLight: "rgba(37, 99, 235, 0.08)",
    bgDark: "rgba(37, 99, 235, 0.16)",
  },
  {
    accentColor: "#7c3aed",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    bgLight: "rgba(139, 92, 246, 0.08)",
    bgDark: "rgba(139, 92, 246, 0.16)",
  },
  {
    accentColor: "#059669",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    bgLight: "rgba(16, 185, 129, 0.08)",
    bgDark: "rgba(16, 185, 129, 0.16)",
  },
  {
    accentColor: "#ea580c",
    gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
    bgLight: "rgba(249, 115, 22, 0.08)",
    bgDark: "rgba(249, 115, 22, 0.16)",
  },
  {
    accentColor: "#dc2626",
    gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    bgLight: "rgba(239, 68, 68, 0.08)",
    bgDark: "rgba(239, 68, 68, 0.16)",
  },
  {
    accentColor: "#0891b2",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
    bgLight: "rgba(6, 182, 212, 0.08)",
    bgDark: "rgba(6, 182, 212, 0.16)",
  },
];

const DEFAULT_ICON_BY_CATEGORY = {
  embedded: "fa-up-right-and-down-left-from-center",
  external: "fa-arrow-up-right-from-square",
};

const hashString = (value = "") =>
  value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

const buildFaviconUrl = (siteUrl = "") => {
  try {
    const parsed = new URL(siteUrl);
    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(parsed.origin)}&sz=128`;
  } catch {
    return "";
  }
};

const resolveCategory = (tool) => {
  if (tool?.category === "embedded" || tool?.category === "external") {
    return tool.category;
  }
  return tool?.canEmbed ? "embedded" : "external";
};

export const DEFAULT_STUDY_TOOLS = [
  {
    id: "desmos",
    nameKey: "toolDesmos",
    descKey: "toolDesmosDesc",
    icon: "fa-square-root-variable",
    launchUrl: "https://www.desmos.com/calculator",
    embedUrl: "https://www.desmos.com/calculator",
    canEmbed: true,
    category: "embedded",
    isDefault: true,
  },
  {
    id: "geogebra",
    nameKey: "toolGeoGebra",
    descKey: "toolGeoGebraDesc",
    icon: "fa-draw-polygon",
    launchUrl: "https://www.geogebra.org/classic",
    embedUrl: "https://www.geogebra.org/classic",
    canEmbed: true,
    category: "embedded",
    isDefault: true,
  },
  {
    id: "phet-area-builder",
    nameKey: "toolPhET",
    descKey: "toolPhETDesc",
    icon: "fa-flask",
    launchUrl:
      "https://phet.colorado.edu/sims/html/area-builder/latest/area-builder_all.html",
    embedUrl:
      "https://phet.colorado.edu/sims/html/area-builder/latest/area-builder_all.html",
    logoUrl: "https://phet.colorado.edu/favicon.ico",
    canEmbed: true,
    category: "embedded",
    isDefault: true,
  },
  {
    id: "youtube-no-ads",
    nameKey: "toolYoutubeNoAds",
    descKey: "toolYoutubeNoAdsDesc",
    icon: "fa-play",
    launchUrl: "https://piped.video",
    embedUrl: "https://piped.video",
    logoUrl: "https://piped.video/img/icons/favicon-32x32.png",
    canEmbed: true,
    category: "embedded",
    isDefault: true,
  },
  {
    id: "ruangguru-blog",
    nameKey: "toolRuangguruBlog",
    descKey: "toolRuangguruBlogDesc",
    icon: "fa-book-open-reader",
    launchUrl: "https://www.ruangguru.com/blog/",
    embedUrl: "https://www.ruangguru.com/blog/",
    logoUrl: "https://cdn-web-2.ruangguru.com/landing-pages/assets/hs/favicon60x60-3.png",
    canEmbed: true,
    category: "embedded",
    isDefault: true,
  },
  {
    id: "quipper-blog",
    nameKey: "toolQuipperBlog",
    descKey: "toolQuipperBlogDesc",
    icon: "fa-school",
    launchUrl: "https://www.quipper.com/id/blog/",
    embedUrl: "https://www.quipper.com/id/blog/",
    logoUrl: "https://www.quipper.com/id/shared/images/favicons/android-chrome-192x192.png",
    canEmbed: true,
    category: "embedded",
    isDefault: true,
  },
  {
    id: "duolingo-blog",
    nameKey: "toolDuolingoBlog",
    descKey: "toolDuolingoBlogDesc",
    icon: "fa-language",
    launchUrl: "https://blog.duolingo.com/",
    embedUrl: "https://blog.duolingo.com/",
    logoUrl:
      "https://storage.ghost.io/c/7a/33/7a33d0f4-927d-4fe8-a6bf-96131b5e76d4/content/images/size/w256h256/2020/03/duolingo-touch-icon2-1.png",
    canEmbed: true,
    category: "embedded",
    isDefault: true,
  },
  {
    id: "codecademy-blog",
    nameKey: "toolCodecademyBlog",
    descKey: "toolCodecademyBlogDesc",
    icon: "fa-code",
    launchUrl: "https://www.codecademy.com/resources/blog/",
    embedUrl: "https://www.codecademy.com/resources/blog/",
    canEmbed: true,
    category: "embedded",
    isDefault: true,
  },
  {
    id: "notebooklm",
    nameKey: "toolNotebookLM",
    descKey: "toolNotebookLMDesc",
    icon: "fa-brain",
    launchUrl: "https://notebooklm.google.com",
    canEmbed: false,
    category: "external",
    isDefault: true,
  },
  {
    id: "clearnotes",
    nameKey: "toolClearNotes",
    descKey: "toolClearNotesDesc",
    icon: "fa-file-lines",
    launchUrl: "https://www.clearnotebooks.com/id/notebooks",
    logoUrl:
      "https://www.clearnotebooks.com/public/assets/favicon-f76bdb959db1c6b0e0195421e352f06c3425f377e78a8bad0d6e95e033fe00cc.ico",
    canEmbed: false,
    category: "external",
    isDefault: true,
  },
  {
    id: "quizlet",
    nameKey: "toolQuizlet",
    descKey: "toolQuizletDesc",
    icon: "fa-layer-group",
    launchUrl: "https://quizlet.com",
    canEmbed: false,
    category: "external",
    isDefault: true,
  },
  {
    id: "bbc-bitesize",
    nameKey: "toolBBCBitesize",
    descKey: "toolBBCBitesizeDesc",
    icon: "fa-newspaper",
    launchUrl: "https://www.bbc.co.uk/bitesize",
    logoUrl:
      "https://static.files.bbci.co.uk/core/website/assets/static/icons/touch/bbc/touch-icon-192.fa493546c3.png",
    canEmbed: false,
    category: "external",
    isDefault: true,
  },
  {
    id: "freecodecamp-news",
    nameKey: "toolFreeCodeCampNews",
    descKey: "toolFreeCodeCampNewsDesc",
    icon: "fa-laptop-code",
    launchUrl: "https://www.freecodecamp.org/news/",
    canEmbed: false,
    category: "external",
    isDefault: true,
  },
  {
    id: "coursera",
    nameKey: "toolCoursera",
    descKey: "toolCourseraDesc",
    icon: "fa-graduation-cap",
    launchUrl: "https://www.coursera.org",
    canEmbed: false,
    category: "external",
    isDefault: true,
  },
  {
    id: "canva-design-school",
    nameKey: "toolCanvaDesignSchool",
    descKey: "toolCanvaDesignSchoolDesc",
    icon: "fa-pen-ruler",
    launchUrl: "https://www.canva.com/designschool/tutorials/",
    canEmbed: false,
    category: "external",
    isDefault: true,
  },
  {
    id: "edx",
    nameKey: "toolEdX",
    descKey: "toolEdXDesc",
    icon: "fa-user-graduate",
    launchUrl: "https://www.edx.org",
    canEmbed: false,
    category: "external",
    isDefault: true,
  },
].map((tool, index) => decorateStudyTool(tool, index));

export function decorateStudyTool(tool, index = 0) {
  const category = resolveCategory(tool);
  const theme =
    TOOL_THEMES[
      Math.abs(hashString(tool?.id || tool?.name || String(index))) %
        TOOL_THEMES.length
    ];

  return {
    ...theme,
    ...tool,
    canEmbed: category === "embedded",
    category,
    icon: tool?.icon || DEFAULT_ICON_BY_CATEGORY[category],
    launchUrl: tool?.launchUrl || tool?.url || "",
    logoUrl: tool?.logoUrl || buildFaviconUrl(tool?.launchUrl || tool?.url || ""),
    embedUrl:
      category === "embedded"
        ? tool?.embedUrl || tool?.launchUrl || tool?.url || ""
        : "",
    isDefault: Boolean(tool?.isDefault),
  };
}

export function sortStudyTools(tools = []) {
  return [...tools].sort((left, right) => {
    if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
    const leftCreated = Number(left.createdAt || 0);
    const rightCreated = Number(right.createdAt || 0);
    if (leftCreated !== rightCreated) return rightCreated - leftCreated;
    return String(left.id).localeCompare(String(right.id));
  });
}
