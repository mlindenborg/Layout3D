interface AuthState {
  isSignedIn: boolean;
  userName: string | null;
  userId: string | null;
}
interface AuthContext {
  isSignedIn: boolean;
  userName: string | null;
  userId: string | null;
  refreshAuth: () => Promise<boolean>;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<boolean>;
}
