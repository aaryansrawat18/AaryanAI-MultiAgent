import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaGoogle } from "react-icons/fa";
import { X } from "lucide-react";
import ArtifactPanel from "../components/ArtifactPanel";
import ChatArea from "../components/ChatArea";
import Sidebar from "../components/Sidebar";
import BrandLogo from "../components/BrandLogo";
import api from "../utils/axios";
import { setUserData } from "../redux/user.slice";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../firebase";
import { APP_NAME, APP_DESCRIPTION } from "../constants/brand";

function Home() {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  const login = async (token) => {
    const { data } = await api.post(`/api/auth/login`, { token });
    dispatch(setUserData(data.user));
    setShowLogin(false);
  };

  const handleGoogleLogin = async () => {
    try {
      setAuthError("");
      setAuthLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      await login(token);
    } catch (error) {
      console.error("Google login failed:", error);
      setAuthError(
        error?.response?.data?.message ||
          error?.code ||
          error?.message ||
          "Google login failed"
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const showAuthModal = !userData && showLogin;

  return (
    <div className="h-screen flex bg-[#0d0f14] text-white overflow-hidden font-sans">
      <Sidebar onLogin={() => setShowLogin(true)} />
      <ChatArea />
      <ArtifactPanel />

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md brand-glow">
          <div className="relative w-[380px] max-w-[92vw] bg-[#13151c]/95 border border-white/[0.1] rounded-3xl p-8 flex flex-col gap-6 shadow-2xl shadow-black/50">
            <button
              type="button"
              onClick={() => setShowLogin(false)}
              className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border-none text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] cursor-pointer"
              aria-label="Close login"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center gap-4 text-center">
              <BrandLogo size="lg" />
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[20px] font-semibold text-slate-100 tracking-tight">
                  Welcome to {APP_NAME}
                </h2>
                <p className="text-[13px] text-slate-500 leading-relaxed max-w-[280px]">
                  {APP_DESCRIPTION}
                </p>
              </div>
            </div>

            {authError && (
              <p className="text-[12px] text-red-400 break-words text-center bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {authError}
              </p>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 py-[12px] rounded-xl text-sm font-medium text-white bg-gradient-to-br from-cyan-400/90 via-indigo-500 to-violet-600 hover:from-cyan-300 hover:via-indigo-400 hover:to-violet-500 active:opacity-90 border border-white/10 shadow-lg shadow-indigo-500/25 transition-all duration-150 cursor-pointer disabled:opacity-60"
            >
              <FaGoogle size={15} className="text-white" />
              {authLoading ? "Signing in..." : "Continue with Google"}
            </button>

            <p className="text-[11px] text-slate-600 text-center">
              Sign in to start chatting with {APP_NAME}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
