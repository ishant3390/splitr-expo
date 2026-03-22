import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import {
  ArrowRight,
  Sparkles,
  Infinity as InfinityIcon,
  ScanLine,
  BellRing,
  Globe,
  CheckCircle2,
  MessageSquare,
  Receipt,
  Star,
  Zap,
  Users,
  TrendingDown,
  Lightbulb,
  PieChart,
  Check,
  Loader2,
} from "lucide-react";

// --- API ---
const API_BASE = import.meta.env.DEV ? "" : "";

async function submitEmail(email: string) {
  const res = await fetch(`${API_BASE}/api/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

async function getWaitlistCount(): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/api/waitlist`);
    const data = await res.json();
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

// --- App Mockup (simplified for teaser) ---
const AppMockup = () => {
  return (
    <div className="relative mx-auto w-full max-w-[300px] aspect-[1/2.1] bg-slate-50 rounded-[40px] shadow-2xl border-[8px] border-slate-900 overflow-hidden flex flex-col">
      {/* Status Bar */}
      <div className="h-11 w-full flex justify-between items-center px-6 pt-2">
        <span className="text-[10px] font-medium text-slate-900">9:41</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-full bg-slate-900" />
          <div className="w-3 h-3 rounded-full bg-slate-900" />
          <div className="w-4 h-3 rounded-sm bg-slate-900" />
        </div>
      </div>

      {/* App Header */}
      <div className="px-5 pt-1 pb-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Splitr
          </h1>
          <p className="text-[10px] text-slate-500">Welcome back, Alex</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
          <BellRing size={14} className="text-slate-600" />
        </div>
      </div>

      {/* Balance Card */}
      <div className="px-3">
        <div className="w-full rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 p-4 relative overflow-hidden shadow-lg shadow-teal-600/20">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
          <p className="text-teal-50 text-[10px] font-medium mb-0.5 relative z-10">
            Net Balance
          </p>
          <h2 className="text-white text-3xl font-bold tracking-tighter mb-3 relative z-10 font-mono tabular-nums">
            $11.25
          </h2>

          <div className="flex gap-3 mb-4 relative z-10">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight size={10} className="text-white rotate-45" />
              </div>
              <div>
                <p className="text-[8px] text-teal-100">You are owed</p>
                <p className="text-xs font-semibold text-white font-mono tabular-nums">
                  $22.50
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight size={10} className="text-white -rotate-45" />
              </div>
              <div>
                <p className="text-[8px] text-teal-100">You owe</p>
                <p className="text-xs font-semibold text-white font-mono tabular-nums">
                  $11.25
                </p>
              </div>
            </div>
          </div>

          <div className="w-full py-2 bg-white/20 rounded-xl flex items-center justify-center gap-1.5 relative z-10 backdrop-blur-sm border border-white/10">
            <Sparkles size={12} className="text-white" />
            <span className="text-white text-xs font-medium">
              Settle up $11.25
            </span>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 px-3 mt-4">
        <div className="flex justify-between items-end mb-2">
          <h3 className="text-xs font-bold text-slate-900">Active Groups</h3>
          <span className="text-[10px] font-medium text-teal-600">
            View all
          </span>
        </div>
        <div className="space-y-2">
          <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">
                🌴
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Trip to Bali
                </p>
                <p className="text-[9px] text-slate-500">2 members</p>
              </div>
            </div>
            <div className="px-1.5 py-0.5 bg-emerald-50 rounded text-[9px] font-medium text-emerald-600">
              settled
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500" />
            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-sm">
                🍕
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">TGIF</p>
                <p className="text-[9px] text-slate-500">4 members</p>
              </div>
            </div>
            <div className="px-1.5 py-0.5 bg-red-50 rounded text-[9px] font-medium text-red-600 font-mono">
              -$11.25
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-sm">
                🏠
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Roommates
                </p>
                <p className="text-[9px] text-slate-500">3 members</p>
              </div>
            </div>
            <div className="px-1.5 py-0.5 bg-emerald-50 rounded text-[9px] font-medium text-emerald-600 font-mono">
              +$8.00
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="h-14 bg-white border-t border-slate-100 flex justify-around items-center px-2 pb-1.5 relative">
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-7 h-1 bg-teal-600 rounded-full absolute top-0" />
          <div className="w-5 h-5 rounded bg-teal-50 flex items-center justify-center mt-0.5">
            <div className="w-3 h-3 border-[1.5px] border-teal-600 rounded-sm" />
          </div>
          <span className="text-[8px] font-medium text-teal-600">Home</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 opacity-40">
          <div className="w-5 h-5 flex items-center justify-center mt-0.5">
            <Users size={12} className="text-slate-900" />
          </div>
          <span className="text-[8px] font-medium text-slate-900">Groups</span>
        </div>
        <div className="w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-600/30 -mt-5 relative z-10">
          <div className="w-3.5 h-3.5 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white -translate-y-1/2 rounded-full" />
            <div className="absolute left-1/2 top-0 h-full w-0.5 bg-white -translate-x-1/2 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5 opacity-40">
          <div className="w-5 h-5 flex items-center justify-center mt-0.5">
            <Zap size={12} className="text-slate-900" />
          </div>
          <span className="text-[8px] font-medium text-slate-900">
            Activity
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5 opacity-40">
          <div className="w-5 h-5 flex items-center justify-center mt-0.5">
            <div className="w-3 h-3 border-[1.5px] border-slate-900 rounded-full" />
          </div>
          <span className="text-[8px] font-medium text-slate-900">
            Profile
          </span>
        </div>
      </div>
    </div>
  );
};

// --- Waitlist Form ---
const WaitlistForm = ({
  variant = "hero",
}: {
  variant?: "hero" | "bottom";
}) => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setState("loading");
    try {
      const data = await submitEmail(email);
      if (data.error) {
        setState("error");
        setMessage(data.error);
      } else {
        setState("success");
        setMessage(data.message);
        setEmail("");
      }
    } catch {
      setState("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (state === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-3 px-6 py-4 rounded-full ${
          variant === "hero"
            ? "bg-emerald-50 border border-emerald-200"
            : "bg-emerald-500/10 border border-emerald-500/20"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            variant === "hero" ? "bg-emerald-100" : "bg-emerald-500/20"
          }`}
        >
          <Check
            size={16}
            className={
              variant === "hero" ? "text-emerald-600" : "text-emerald-400"
            }
          />
        </div>
        <span
          className={`text-sm font-medium ${
            variant === "hero" ? "text-emerald-700" : "text-emerald-300"
          }`}
        >
          {message}
        </span>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div
        className={`flex items-center rounded-full p-1.5 ${
          variant === "hero"
            ? "bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-[0px_10px_40px_5px_rgba(20,184,166,0.08)]"
            : "bg-white/10 backdrop-blur-md border border-white/20"
        }`}
      >
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          className={`flex-1 bg-transparent border-none outline-none px-4 text-sm font-geist ${
            variant === "hero"
              ? "text-slate-700 placeholder:text-slate-400"
              : "text-white placeholder:text-white/50"
          }`}
          required
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="bg-teal-600 text-white px-5 py-2.5 rounded-full font-medium text-sm shadow-[inset_-4px_-6px_25px_0px_rgba(0,0,0,0.1),inset_4px_4px_10px_0px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform duration-300 cursor-pointer whitespace-nowrap disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-2"
        >
          {state === "loading" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Get Early Access
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
      {state === "error" && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-xs mt-2 ml-4"
        >
          {message}
        </motion.p>
      )}
    </form>
  );
};

// --- Live Counter ---
const WaitlistCounter = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    getWaitlistCount().then(setCount);
  }, []);

  if (count === null || count === 0) {
    return (
      <div className="flex items-center gap-2 text-sm font-geist text-slate-500">
        <Sparkles size={14} className="text-teal-500" />
        <span>Be among the first to try Splitr</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm font-geist text-slate-500">
      <div className="flex -space-x-2">
        {[
          "bg-teal-500",
          "bg-cyan-500",
          "bg-emerald-500",
          count > 3 ? "bg-amber-500" : "",
        ]
          .filter(Boolean)
          .map((bg, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full ${bg} border-2 border-white flex items-center justify-center`}
            >
              <span className="text-[8px] font-bold text-white">
                {String.fromCharCode(65 + i)}
              </span>
            </div>
          ))}
      </div>
      <span>
        Join{" "}
        <strong className="text-slate-700">
          {count.toLocaleString()}+ people
        </strong>{" "}
        on the waitlist
      </span>
    </div>
  );
};

// --- Sections ---

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold text-xl tracking-tighter">
            S
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">
            Splitr
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            Features
          </a>
          <a
            href="#ai"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            AI Magic
          </a>
        </nav>

        <a
          href="#waitlist"
          className="inline-flex items-center justify-center font-medium text-sm bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-full px-5 py-2 shadow-[0_4px_16px_rgba(13,148,136,0.3)] hover:shadow-[0_6px_20px_rgba(13,148,136,0.4)] transition-all duration-200 active:scale-95 cursor-pointer"
        >
          Join Waitlist
        </a>
      </div>
    </header>
  );
};

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white pt-20">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.25, 0.45, 0.25],
            x: [0, 40, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-teal-300/30 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.35, 0.15],
            x: [0, -30, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute top-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-300/25 blur-[120px]"
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Text Column */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center lg:text-left flex flex-col items-center lg:items-start"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50/80 border border-teal-100/80 text-teal-700 text-sm font-medium mb-8 backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
              </span>
              <span>Launching Soon</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.2,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="font-geist font-medium tracking-[-0.04em] text-[46px] md:text-[68px] leading-[1.05] text-slate-900 mb-6"
            >
              Expense splitting,
              <br />
              <span className="font-instrument italic text-[56px] md:text-[82px] font-normal text-teal-700">
                reimagined
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="font-geist text-lg text-slate-600 max-w-[480px] leading-relaxed mb-8"
            >
              AI-powered receipt scanning. Natural language expense entry.
              Unlimited groups. Multi-currency. And it's{" "}
              <strong className="text-slate-800">100% free, forever.</strong>
            </motion.p>

            {/* Waitlist Form */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="w-full max-w-md mb-6"
            >
              <WaitlistForm variant="hero" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            >
              <WaitlistCounter />
            </motion.div>
          </motion.div>

          {/* Mockup Column */}
          <div className="relative flex items-center justify-center mt-8 lg:mt-0">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <AppMockup />
              </motion.div>
            </motion.div>

            {/* Floating Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20, x: -10 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{
                delay: 0.9,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute top-1/4 -left-4 md:-left-10 bg-white/90 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-100 hidden sm:block"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center">
                    <ScanLine className="text-teal-600" size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium font-geist">
                      AI Receipt Scan
                    </p>
                    <p className="text-sm font-bold text-slate-900 font-geist">
                      Added $45.00
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -20, x: 10 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{
                delay: 1.1,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute bottom-1/4 -right-4 md:-right-10 bg-white/90 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-100 hidden sm:block"
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{
                  duration: 5.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="text-emerald-600" size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium font-geist">
                      Settled Up
                    </p>
                    <p className="text-sm font-bold text-slate-900 font-geist">
                      Zero Balance
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Animated Chat Demo ---
const AnimatedChat = () => {
  const scenarios = [
    {
      u: "Split $50 between me and Alex for Trip to Bali",
      a: "Done! Added to Trip to Bali.\nYou paid $50.00. Alex owes you $25.00.",
    },
    {
      u: "Groceries were $120, split with the house",
      a: "Sorted. Added to House.\n3 people owe you $30.00 each.",
    },
    {
      u: "Uber was $24, just me and Sarah",
      a: "Added to Sarah.\nShe owes you $12.00.",
    },
  ];
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("typing");

  useEffect(() => {
    let isMounted = true;
    let t1: ReturnType<typeof setTimeout>,
      t2: ReturnType<typeof setTimeout>,
      t3: ReturnType<typeof setTimeout>,
      t4: ReturnType<typeof setTimeout>;

    const runCycle = () => {
      if (!isMounted) return;
      setPhase("typing");
      t1 = setTimeout(() => {
        if (isMounted) setPhase("user");
      }, 500);
      t2 = setTimeout(() => {
        if (isMounted) setPhase("thinking");
      }, 1500);
      t3 = setTimeout(() => {
        if (isMounted) setPhase("ai");
      }, 3000);
      t4 = setTimeout(() => {
        if (isMounted) {
          setPhase("fade");
          setTimeout(() => {
            if (isMounted) {
              setIdx((prev) => (prev + 1) % scenarios.length);
              runCycle();
            }
          }, 500);
        }
      }, 6500);
    };

    runCycle();

    return () => {
      isMounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <div className="w-full max-w-sm flex flex-col gap-4 mt-8 h-[220px] justify-end relative">
      <AnimatePresence>
        {phase !== "typing" && phase !== "fade" && (
          <motion.div
            key={`user-${idx}`}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="self-end bg-teal-600 text-white p-3 md:p-4 rounded-2xl rounded-tr-sm text-sm shadow-lg max-w-[85%]"
          >
            {scenarios[idx].u}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-[80px] w-full flex flex-col justify-start">
        <AnimatePresence mode="wait">
          {phase === "thinking" && (
            <motion.div
              key={`thinking-${idx}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="self-start bg-slate-700 text-slate-300 p-3 rounded-2xl rounded-tl-sm text-sm shadow-lg flex gap-2 items-center border border-slate-600"
            >
              <Sparkles size={14} className="text-teal-400 animate-pulse" />
              Thinking...
            </motion.div>
          )}
          {phase === "ai" && (
            <motion.div
              key={`ai-${idx}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="self-start bg-slate-700 text-slate-100 p-3 md:p-4 rounded-2xl rounded-tl-sm text-sm shadow-lg flex gap-3 items-start border border-slate-600 max-w-[95%]"
            >
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={14} className="text-teal-400" />
              </div>
              <div className="whitespace-pre-line leading-relaxed">
                {scenarios[idx].a}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- AI Magic Section ---
const AIMagic = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="ai" className="py-24 bg-slate-900 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm font-medium mb-6">
            <Sparkles size={14} />
            <span>Splitr AI</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Just text it or snap it.
          </h2>
          <p className="text-lg text-slate-400">
            Don't want to tap through menus? Tell Splitr what happened in plain
            English, or scan a receipt. Our AI handles the math, categorization,
            and gives you smart insights.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
          {/* Chat Interface */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8 flex flex-col items-center justify-center min-h-[400px] relative backdrop-blur-sm"
          >
            <div className="absolute top-6 left-6 flex items-center gap-2 text-slate-300 font-medium">
              <MessageSquare size={20} className="text-teal-400" />
              Natural Language
            </div>
            <AnimatedChat />
          </motion.div>

          {/* Receipt Scanner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8 flex flex-col items-center justify-center min-h-[400px] relative backdrop-blur-sm overflow-hidden"
          >
            <div className="absolute top-6 left-6 flex items-center gap-2 text-slate-300 font-medium z-20">
              <Receipt size={20} className="text-teal-400" />
              Smart Scanning
            </div>

            <div className="relative mt-8">
              <div className="w-56 bg-white rounded-sm shadow-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
                <div className="w-full h-6 bg-slate-100 rounded flex items-center justify-center mb-2">
                  <div className="w-16 h-2 bg-slate-200 rounded-full" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="w-24 h-2 bg-slate-200 rounded-full" />
                  <div className="w-8 h-2 bg-slate-200 rounded-full" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="w-20 h-2 bg-slate-200 rounded-full" />
                  <div className="w-10 h-2 bg-slate-200 rounded-full" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="w-28 h-2 bg-slate-200 rounded-full" />
                  <div className="w-8 h-2 bg-slate-200 rounded-full" />
                </div>
                <div className="w-full border-t border-dashed border-slate-300 my-2" />
                <div className="flex justify-between items-center">
                  <div className="w-12 h-3 bg-slate-300 rounded-full" />
                  <div className="w-12 h-3 bg-slate-800 rounded-full" />
                </div>

                <motion.div
                  animate={{ top: ["-10%", "110%", "-10%"] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute left-0 right-0 h-1 bg-teal-400 shadow-[0_0_15px_3px_rgba(45,212,191,0.6)] z-10"
                />
              </div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="absolute -left-12 top-1/4 bg-slate-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl border border-slate-600 flex items-center gap-1.5 z-20"
              >
                <CheckCircle2 size={12} className="text-teal-400" />
                3 Items Found
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.5 }}
                className="absolute -right-12 bottom-1/4 bg-teal-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl border border-teal-500 flex items-center gap-1.5 z-20"
              >
                <Sparkles size={12} className="text-teal-200" />
                Total: $45.00
              </motion.div>
            </div>
          </motion.div>

          {/* AI Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8 flex flex-col items-center justify-center min-h-[400px] relative backdrop-blur-sm overflow-hidden md:col-span-2 lg:col-span-1"
          >
            <div className="absolute top-6 left-6 flex items-center gap-2 text-slate-300 font-medium z-20">
              <Lightbulb size={20} className="text-teal-400" />
              Spending Insights
            </div>

            <div className="w-full max-w-[260px] mt-8 relative">
              <svg
                className="absolute -bottom-4 -right-4 w-32 h-32 text-teal-500/20"
                viewBox="0 0 100 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              >
                <path d="M0 100 Q 25 80 50 90 T 100 40" />
              </svg>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="bg-slate-700/80 rounded-2xl p-5 border border-slate-600 shadow-xl relative z-10 backdrop-blur-md"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <TrendingDown size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">
                      Dining Out
                    </p>
                    <p className="text-lg font-bold text-white">
                      -24% this month
                    </p>
                  </div>
                </div>
                <div className="w-full h-px bg-slate-600 mb-4" />
                <p className="text-sm text-slate-300 leading-relaxed">
                  <strong className="text-teal-400 font-semibold">
                    AI Insight:
                  </strong>{" "}
                  You're saving $45/mo compared to your usual weekend
                  takeaways. Keep it up!
                </p>
              </motion.div>

              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="bg-slate-700/80 rounded-2xl p-4 border border-slate-600 shadow-xl relative z-10 backdrop-blur-md mt-4 ml-8"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <PieChart size={16} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-300">
                      Top Category
                    </p>
                    <p className="text-sm font-bold text-white">
                      Travel (42%)
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FeatureTeaser = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const features = [
    {
      icon: <MessageSquare size={22} className="text-teal-600" />,
      title: "Natural Language",
      description:
        'Say "Split $50 for dinner with Alex" and Splitr handles the rest.',
      bg: "bg-teal-50",
    },
    {
      icon: <Receipt size={22} className="text-cyan-600" />,
      title: "Receipt Scanning",
      description:
        "Snap a photo. AI reads every line item and splits it instantly.",
      bg: "bg-cyan-50",
    },
    {
      icon: <InfinityIcon size={22} className="text-emerald-600" />,
      title: "Unlimited & Free",
      description:
        "No expense limits. No premium tiers. No ads. Free forever.",
      bg: "bg-emerald-50",
    },
    {
      icon: <Globe size={22} className="text-indigo-600" />,
      title: "Multi-Currency",
      description:
        "Travel globally. Add expenses in any currency, auto-converted.",
      bg: "bg-indigo-50",
    },
    {
      icon: <BellRing size={22} className="text-amber-600" />,
      title: "Smart Nudges",
      description:
        "Gentle reminders so your friends pay up — without the awkwardness.",
      bg: "bg-amber-50",
    },
    {
      icon: <Sparkles size={22} className="text-purple-600" />,
      title: "AI Insights",
      description:
        "Spending trends, category breakdowns, and smart saving tips.",
      bg: "bg-purple-50",
    },
  ];

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-5">
            Everything Splitwise charges for.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-cyan-600">
              We give it away.
            </span>
          </h2>
          <p className="text-lg text-slate-500">
            Built from the ground up with AI, not bolted on as an afterthought.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.1 + idx * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group p-6 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 bg-white"
            >
              <div
                className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                {feature.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const steps = [
    {
      num: "01",
      title: "Snap or type",
      description:
        "Photograph a receipt or describe the expense in plain English. The AI does the parsing.",
      icon: <ScanLine size={24} className="text-teal-400" />,
    },
    {
      num: "02",
      title: "AI splits it",
      description:
        "Splitr categorizes, calculates, and assigns each person's share automatically.",
      icon: <Sparkles size={24} className="text-teal-400" />,
    },
    {
      num: "03",
      title: "One-tap settle",
      description:
        "Settle up via Venmo, PayPal, Cash App, UPI, or any payment method you prefer.",
      icon: <CheckCircle2 size={24} className="text-teal-400" />,
    },
  ];

  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/8 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm font-medium mb-6">
            <Zap size={14} />
            <span>How It Works</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-5">
            Three steps. Zero friction.
          </h2>
          <p className="text-lg text-slate-400">
            From receipt to settled in seconds — not minutes.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.15 + idx * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/60 hover:border-teal-500/30 transition-colors duration-300"
            >
              <div className="text-5xl font-bold text-slate-700/50 font-mono absolute top-6 right-6">
                {step.num}
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-5">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const BottomCTA = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="waitlist" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="bg-slate-900 rounded-[32px] p-10 md:p-16 text-center relative overflow-hidden shadow-2xl"
        >
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-teal-500/20 to-transparent blur-3xl pointer-events-none" />

          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4 relative z-10">
            Don't miss the launch.
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-xl mx-auto relative z-10">
            Be the first to experience the modern, AI-powered way to split
            expenses. No spam, just a launch-day invite.
          </p>

          <div className="flex justify-center relative z-10">
            <WaitlistForm variant="bottom" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-slate-50 py-10 border-t border-slate-200">
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold text-xs">
          S
        </div>
        <span className="font-bold text-slate-900 text-sm">Splitr</span>
      </div>

      <div className="flex gap-6 text-sm text-slate-400 font-medium">
        <a href="#" className="hover:text-teal-600 transition-colors">
          Privacy
        </a>
        <a href="#" className="hover:text-teal-600 transition-colors">
          Terms
        </a>
        <a
          href="mailto:hello@splitr.ai"
          className="hover:text-teal-600 transition-colors"
        >
          Contact
        </a>
      </div>

      <p className="text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Splitr. All rights reserved.
      </p>
    </div>
  </footer>
);

export default function App() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-teal-200 selection:text-teal-900">
      <Navbar />
      <main>
        <Hero />
        <FeatureTeaser />
        <AIMagic />
        <HowItWorks />
        <BottomCTA />
      </main>
      <Footer />
    </div>
  );
}
