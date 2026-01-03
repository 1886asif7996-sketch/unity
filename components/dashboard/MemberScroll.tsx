"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { Profile } from "@/types";

export default function MemberScroll() {
    const [members, setMembers] = useState<Profile[]>([]);
    const supabase = createClient();

    useEffect(() => {
        const fetchMembers = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('status', 'active');
            if (data) setMembers(data);
        };

        fetchMembers();
    }, []);

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Members</h2>
            </div>

            {members.length === 0 ? (
                <div className="text-gray-500 text-sm italic">No active members yet.</div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x touch-pan-x">
                    {members.map((member, i) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex-shrink-0 snap-start"
                        >
                            <div className="flex flex-col items-center gap-3 w-20">
                                <div className={`w-20 h-20 rounded-2xl overflow-hidden border-2 p-1 ${member.fine_amount > 0 ? 'border-red-500' : 'border-white/10'}`}>
                                    <img
                                        src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.full_name}&background=random`}
                                        alt={member.full_name}
                                        className="w-full h-full rounded-xl object-cover grayscale transition-all hover:grayscale-0"
                                    />
                                </div>
                                <span className="text-sm text-gray-400 font-medium truncate w-full text-center">
                                    {member.full_name?.split(' ')[0]}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
