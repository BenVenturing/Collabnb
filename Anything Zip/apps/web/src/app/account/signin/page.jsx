import { useState } from "react";
import useAuth from "@/utils/useAuth";

function MainComponent() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { signInWithCredentials } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      await signInWithCredentials({
        email,
        password,
        callbackUrl: "/",
        redirect: true,
      });
    } catch (err) {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(to bottom right, #EFECE9, #D1EBDB)",
        padding: "16px",
      }}
    >
      <form
        noValidate
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: "420px",
          borderRadius: "28px",
          background: "rgba(239, 236, 233, 0.65)",
          backdropFilter: "blur(12px)",
          padding: "32px",
          boxShadow: "0 8px 32px rgba(25, 37, 36, 0.12)",
          border: "1px solid rgba(208, 213, 206, 0.45)",
        }}
      >
        <h1
          style={{
            marginBottom: "32px",
            textAlign: "center",
            fontSize: "32px",
            fontWeight: "700",
            color: "#192524",
          }}
        >
          Welcome Back
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#192524",
              }}
            >
              Email
            </label>
            <input
              required
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: "100%",
                background: "rgba(239, 236, 233, 0.55)",
                border: "1px solid rgba(149, 157, 144, 0.5)",
                borderRadius: "14px",
                padding: "14px 16px",
                fontSize: "16px",
                color: "#192524",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3C5759")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(149, 157, 144, 0.5)")
              }
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#192524",
              }}
            >
              Password
            </label>
            <input
              required
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                background: "rgba(239, 236, 233, 0.55)",
                border: "1px solid rgba(149, 157, 144, 0.5)",
                borderRadius: "14px",
                padding: "14px 16px",
                fontSize: "16px",
                color: "#192524",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3C5759")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(149, 157, 144, 0.5)")
              }
            />
          </div>

          {error && (
            <div
              style={{
                borderRadius: "12px",
                background: "#FEE2E2",
                padding: "12px",
                fontSize: "14px",
                color: "#DC2626",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              borderRadius: "14px",
              background: "#3C5759",
              padding: "16px",
              fontSize: "16px",
              fontWeight: "700",
              color: "#EFECE9",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <p
            style={{
              textAlign: "center",
              fontSize: "14px",
              color: "#959D90",
            }}
          >
            Don't have an account?{" "}
            <a
              href={`/account/signup${
                typeof window !== "undefined" ? window.location.search : ""
              }`}
              style={{
                color: "#3C5759",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              Sign up
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}

export default MainComponent;
