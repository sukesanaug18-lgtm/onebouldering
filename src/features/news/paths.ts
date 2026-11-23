// Shared by the server action, the image route and pages.
export const NEWS_ID = /^[a-z0-9-]{6,40}$/;
export const newsImagePath = (id: string) => `news/${id}.webp`;
