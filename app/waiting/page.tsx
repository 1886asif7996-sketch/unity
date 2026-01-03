"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function WaitingPage() {
    const router = useRouter();
    const supabase = createClient();

    const checkStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('status').eq('id', user.id).single();
            if (data?.status === 'active') {
                router.push('/');
            } else {
                alert("Still pending approval!");
            }
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-md"
            >
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="text-yellow-500 w-10 h-10" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Approval Pending</h1>
                <p className="text-gray-400 mb-8">
                    Your account is currently under review by the Admin. Please wait for approval to access the Unity2020 Dashboard.
                </p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={checkStatus}
                        className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        Check Status
                    </button>
                    <button
                        onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                        className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
