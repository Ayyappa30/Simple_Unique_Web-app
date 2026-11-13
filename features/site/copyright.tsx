import { cacheLife } from "next/cache";
import { site } from "@/features/site/site-config";

// Server component: with Cache Components the current date may only be read inside a cached scope.
export async function Copyright() {
  "use cache";
  cacheLife("days");
  return <>&copy; {new Date().getFullYear()} {site.name}</>;
}
