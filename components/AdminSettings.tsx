"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function AdminSettings() {
    const [fee, setFee] = useState("300");
    const [notice, setNotice] = useState("");
    const supabase = createClient();

    const updateFee = async () => {
        const { error } = await supabase
            .from('settings')
            .upsert({ key_name: 'monthly_fee', value: fee }, { onConflict: 'key_name' });

        if (error) toast.error("Failed to update fee");
        else toast.success("Monthly fee updated globally!");
    };

    const postNotice = async () => {
        if (!notice) return;
        const { error } = await supabase
            .from('notices')
            .insert({ title: 'Admin Notice', content: notice });

        if (error) toast.error("Failed to post notice");
        else {
            toast.success("Notice posted!");
            setNotice("");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fee Settings */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-bold mb-4">Financial Settings</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">Monthly Fee (BDT)</label>
                        <input
                            type="number"
                            value={fee}
                            onChange={(e) => setFee(e.target.value)}
                            className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-2 focus:border-success outline-none"
                        />
                    </div>
                    <button
                        onClick={updateFee}
                        className="w-full bg-success text-black font-bold py-2 rounded-lg hover:bg-success/90"
                    >
                        Update Fee
                    </button>
                </div>
            </div>

            {/* Notice Board */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-bold mb-4">Post Notice</h3>
                <div className="space-y-4">
                    <textarea
                        rows={3}
                        value={notice}
                        onChange={(e) => setNotice(e.target.value)}
                        placeholder="Write a new announcement..."
                        className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-2 focus:border-success outline-none resize-none"
                    />
                    <button
                        onClick={postNotice}
                        className="w-full bg-white text-black font-bold py-2 rounded-lg hover:bg-gray-200"
                    >
                        Post Notice
                    </button>
                </div>
            </div>
        </div>
    );
}
