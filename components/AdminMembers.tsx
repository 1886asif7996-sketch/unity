"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Profile } from "@/types";
import toast from "react-hot-toast";
import { Check, X, ShieldAlert } from "lucide-react";

export default function AdminMembers() {
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // Fetch Members
    useEffect(() => {
        const fetchMembers = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) toast.error("Failed to load members");
            else setMembers(data || []);
            setLoading(false);
        };

        fetchMembers();

        // Realtime Subscription
        const channel = supabase
            .channel('table-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
                fetchMembers(); // Simply refetch for simplicity
            })
            .subscribe();

        return () => { supabase.removeChannel(channel) };
    }, []);

    // Approve User
    const approveUser = async (id: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ status: 'active' })
            .eq('id', id);

        if (error) toast.error("Error approving user");
        else toast.success("User approved!");
    };

    // Add Fine (Mock Modal Logic)
    const addFine = async (id: string) => {
        const amount = prompt("Enter fine amount:");
        if (!amount) return;

        const { error } = await supabase.rpc('add_fine', {
            user_uuid: id,
            fine_val: parseFloat(amount)
        });
        // Note: You needs to create this RPC or just update the row directly.
        // Simple update approach for now:
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ fine_amount: members.find(m => m.id === id)!.fine_amount + parseFloat(amount) })
            .eq('id', id);

        if (updateError) toast.error("Error adding fine");
        else toast.success("Fine added!");
    };

    if (loading) return <div className="text-white">Loading members...</div>;

    return (
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6">Member Management</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                    <thead className="text-xs uppercase bg-black/20 text-gray-400">
                        <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {members.map((member) => (
                            <tr key={member.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                                        {/* Avatar placeholder */}
                                        <img src={member.avatar_url || "https://i.pravatar.cc/150"} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    {member.full_name || member.email}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs ${member.status === 'active' ? 'bg-success/20 text-success' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                        {member.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs">{member.role}</td>
                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                    {member.status === 'pending' && (
                                        <button
                                            onClick={() => approveUser(member.id)}
                                            className="p-1.5 bg-success/10 text-success rounded-lg hover:bg-success/20"
                                            title="Approve User"
                                        >
                                            <Check size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => addFine(member.id)}
                                        className="p-1.5 bg-error/10 text-error rounded-lg hover:bg-error/20"
                                        title="Add Fine"
                                    >
                                        <ShieldAlert size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
