"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Transaction } from "@/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function ActivityList() {
    const [activities, setActivities] = useState<Transaction[]>([]);
    const supabase = createClient();

    useEffect(() => {
        const fetchActivities = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('transactions')
                .select(`*, user:profiles(full_name, avatar_url)`)
                .eq('user_id', user.id) // Filter by Current User
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) setActivities(data as any);
        };

        fetchActivities();

        const channel = supabase
            .channel('realtime_transactions')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => {
                fetchActivities();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel) };
    }, []);

    return (
        <div className="w-full pb-24 md:pb-0">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Your Monthly Activities</h2>
            </div>
            <div className="space-y-3">
                {activities.length === 0 ? (
                    <div className="text-gray-500 text-sm">No activity found.</div>
                ) : (
                    activities.map((item, i) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between p-4 rounded-2xl bg-[#1A1A1A] border border-white/5 hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800">
                                    <img src={item.user?.avatar_url || `https://ui-avatars.com/api/?name=${item.user?.full_name}`} alt={item.user?.full_name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium text-lg">{item.type === 'monthly' ? 'Monthly Deposit' : 'Fine Payment'}</h4>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", item.type === 'monthly' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                            {item.type === 'monthly' ? 'Paid' : 'Fine'}
                                        </span>
                                        <span className="text-gray-500 text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-xl font-semibold text-white">${item.amount}</div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
