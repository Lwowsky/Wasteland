export const DEFAULT_SITE_SETTINGS = Object.freeze({
  siteName: "Wasteland King",
  brandText: "Wasteland King",
  regionNumber: 987,
  regionName: "We are One",
  footerByLanguage: {},
});

export const SITE_SETTINGS_LIMITS = Object.freeze({
  siteName: 80,
  brandText: 80,
  regionName: 80,
  regionNumberMin: 1,
  regionNumberMax: 99999,
});

export const SITE_FOOTER_FIELDS = Object.freeze([
  "description",
  "authorLabel",
  "author",
  "authorDescription",
  "projectDescription",
  "copyright",
]);

export const SITE_FOOTER_LIMITS = Object.freeze({
  description: 240,
  authorLabel: 80,
  author: 80,
  authorDescription: 180,
  projectDescription: 240,
  copyright: 180,
});
