// Auth — full-screen sign-in (direct /auth, OAuth return, redirects from protected routes).
import AnimatedSection from "@/components/AnimatedSection";
import { AuthFormPanel } from "@/components/auth/AuthFormPanel";

const Auth = () => {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('/kenyan-workers.jpg')`,
          backgroundColor: "#1e3a5f",
          backgroundSize: "cover",
          backgroundPosition: "center center",
        }}
      />
      <div className="absolute inset-0 bg-black/20 z-0" />

      <AnimatedSection animation="scaleIn" className="relative z-10">
        <AuthFormPanel variant="full" idPrefix="auth" syncTabToUrl />
      </AnimatedSection>
    </div>
  );
};

export default Auth;
