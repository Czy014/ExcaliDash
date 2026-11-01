const configuredBaseUrl = new URL(
  process.env.BASE_URL || "http://127.0.0.1:26767/",
);

if (!configuredBaseUrl.pathname.endsWith("/")) {
  configuredBaseUrl.pathname += "/";
}

export const appBasePath = configuredBaseUrl.pathname;

export const appUrl = (path = "/") => {
  const relativePath = path.replace(/^\/+/, "");
  return new URL(relativePath, configuredBaseUrl).toString();
};
