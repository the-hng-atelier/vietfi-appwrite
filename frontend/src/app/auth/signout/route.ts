import { signoutAction } from "@/app/login/actions";

export async function POST() {
  await signoutAction();
}
