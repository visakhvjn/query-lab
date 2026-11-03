import { ChallengeApp } from "@/components/challenge-app";
import { getLatestVersion } from "@/lib/changelog";

export default async function Home() {
  const version = await getLatestVersion();
  return <ChallengeApp version={version} />;
}
