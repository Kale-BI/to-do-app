import { Link, useNavigate } from "react-router-dom";
import { AuthForm } from "./AuthForm";
import { authClient } from "./lib/auth-client";

export function SignInPage() {
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Sign in"
      submitLabel="Sign in"
      onSubmit={async (email, password) => {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) return error.message ?? "Sign-in failed";
        navigate("/");
        return null;
      }}
      footer={
        <>
          No account? <Link to="/sign-up" className="underline">Sign up</Link>
        </>
      }
    />
  );
}
