import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

interface ResetPlayerPasswordPayload {
  login: string;
  temporaryPassword: string;
}

interface ResetPlayerPasswordResult {
  ok: boolean;
}


export const resetPlayerPassword = async (
  login: string,
  temporaryPassword: string,
) => {

  const resetPassword = httpsCallable<
    ResetPlayerPasswordPayload,
    ResetPlayerPasswordResult
  >(
    functions,
    "resetPlayerPassword"
  );


  const result = await resetPassword({
    login,
    temporaryPassword,
  });


  return result.data;
};