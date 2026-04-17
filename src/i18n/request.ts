import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { defaultLocale, locales, type Locale } from "@/i18n/config";

export default getRequestConfig(async ({ requestLocale }) => {
  const resolvedLocale = await requestLocale;
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const candidate =
    cookieLocale && locales.includes(cookieLocale as Locale)
      ? cookieLocale
      : resolvedLocale;
  const locale = locales.includes(candidate as Locale)
    ? (candidate as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
