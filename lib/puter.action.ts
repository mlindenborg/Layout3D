import puter from "@heyputer/puter.js";

//Puter action for signing in user
export const signIn = async () => await puter.auth.signIn();

//Puter action for signing out user
export const signOut = () => puter.auth.signOut();

//Puter action for getting out user
export const getCurrentUser = async () => {
  try {
    return await puter.auth.getUser();
  } catch {
    return null;
  }
};
