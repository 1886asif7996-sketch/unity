"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Loader2, User, ShieldCheck, Info } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function LoginPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Login
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            if (error.message.includes("Invalid login credentials")) {
                toast.error("Account not found. Please switch to 'Member' and Create Account first!", { duration: 5000, icon: '🔍' });
            } else {
                toast.error(error.message);
            }
            setLoading(false);
            return;
        }

        if (data.user) {
            const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

            // Handle case where profile doesn't exist yet (trigger delay or failure)
            let userRole = profile?.role || 'user';
            let userStatus = profile?.status || 'pending';

            if (!profile && !profileError) {
                // Fallback: Use metadata or default
                userRole = 'user';
            }

            // Admin Mode Check
            if (isAdmin) {
                if (userRole !== 'admin') {
                    toast.error("Access Denied: You are not an Admin.", { icon: '🚫' });
                    await supabase.auth.signOut();
                    setLoading(false);
                    return;
                }
                toast.success("Welcome, Admin!");
                router.push("/admin");
                return;
            }

            // Member Mode
            if (userRole === 'admin') {
                toast("Admin logged in as Member.");
            }

            router.push("/");
            router.refresh();
        }
    };

    const handleSignUp = async () => {
        if (isAdmin) {
            toast.error("Admins cannot sign up here. Create a Member account first, then promote it in Database.", { duration: 6000 });
            return;
        }
        setLoading(true);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: email.split('@')[0], avatar_url: `https://ui-avatars.com/api/?name=${email}` } }
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Account Created! You can now Login.", { duration: 6000 });
            // Optional: Auto-login logic could go here, but manual is safer for verifying flow
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen w-full bg-black flex flex-col md:flex-row items-center justify-center p-4 relative overflow-hidden">
            <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />

            <div className={`absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-1000 ${isAdmin ? 'bg-red-900/30' : 'bg-purple-900/30'}`} />

            <div className="flex-1 w-full max-w-md z-10">
                <motion.div layout className="glass p-8 rounded-3xl w-full border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl">
                    {/* Header Message */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white mb-2">{isAdmin ? 'Admin Portal' : 'Member Login'}</h2>
                        {isAdmin && <p className="text-xs text-red-400 bg-red-900/20 py-1 px-3 rounded-full inline-block">Authorized Personnel Only</p>}
                    </div>

                    {/* Toggle */}
                    <div className="flex bg-white/5 rounded-xl p-1 mb-8">
                        <button onClick={() => setIsAdmin(false)} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-colors ${!isAdmin ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-400'}`}><User size={16} className="inline mr-2" /> Member</button>
                        <button onClick={() => setIsAdmin(true)} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-colors ${isAdmin ? 'bg-white/10 text-red-500' : 'text-gray-500 hover:text-gray-400'}`}><ShieldCheck size={16} className="inline mr-2" /> Admin</button>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="text-gray-400 text-sm ml-1 mb-1 block">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${isAdmin ? 'border-red-500/30 focus:border-red-500' : 'border-white/10 focus:border-purple-500'}`} required placeholder="user@example.com" />
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm ml-1 mb-1 block">Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${isAdmin ? 'border-red-500/30 focus:border-red-500' : 'border-white/10 focus:border-purple-500'}`} required placeholder="••••••••" />
                        </div>
                        <button disabled={loading} className={`w-full font-bold py-4 rounded-xl flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all ${isAdmin ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/20' : 'bg-white text-black'}`}>
                            {loading ? <Loader2 className="animate-spin" /> : "Sign In"} {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    {!isAdmin ? (
                        <div className="mt-8 pt-6 border-t border-white/10 text-center">
                            <p className="text-gray-500 text-sm mb-3">Don't have an account?</p>
                            <button onClick={handleSignUp} className="text-white bg-white/10 px-6 py-2 rounded-lg text-sm font-bold hover:bg-white hover:text-black transition-all">Create Account</button>
                        </div>
                    ) : (
                        <div className="mt-8 text-center bg-white/5 p-4 rounded-xl">
                            <p className="text-xs text-gray-400 flex items-start gap-2 text-left">
                                <Info size={14} className="mt-0.5 shrink-0" />
                                To create an admin: Sign up as a Member first, then change the role to 'admin' in your Database.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
