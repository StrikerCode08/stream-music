function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};

  return cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const eqIndex = item.indexOf("=");
      if (eqIndex === -1) return acc;
      const key = item.slice(0, eqIndex).trim();
      const value = decodeURIComponent(item.slice(eqIndex + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

function setHttpOnlyCookie({
  req,
  res,
  name,
  value,
  maxAgeSec,
  sameSite,
  secure,
}) {
  const encodedValue = encodeURIComponent(value);
  res.setHeader(
    "Set-Cookie",
    `${name}=${encodedValue}; Path=/; Max-Age=${maxAgeSec}; SameSite=${sameSite}; ${
      secure ? "Secure; " : ""
    }HttpOnly`
  );
}

module.exports = {
  parseCookies,
  setHttpOnlyCookie,
};
