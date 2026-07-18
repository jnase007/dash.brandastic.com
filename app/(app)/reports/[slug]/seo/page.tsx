import { redirect } from "next/navigation";

/** SEO lives under /seo/[slug]; keep report URL parity with Meta/Google channels. */
export default async function ReportSeoRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/seo/${slug}`);
}
