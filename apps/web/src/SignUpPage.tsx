import { Link, useNavigate } from "react-router-dom";
import { AuthForm } from "./AuthForm";
import { authClient } from "./lib/auth-client";

export function SignUpPage() {
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Create account"
      submitLabel="Create account"
      onSubmit={async (email, password) => {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0] ?? email,
        });
        if (error) return error.message ?? "Sign-up failed";
        navigate("/");
        return null;
      }}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/sign-in" className="underline">
            Sign in
          </Link>
        </>
      }
    />
  );
}
