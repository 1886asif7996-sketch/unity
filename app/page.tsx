"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Sidebar from "@/components/dashboard/Sidebar";
import BottomNav from "@/components/dashboard/BottomNav";
import MagicCard from "@/components/dashboard/MagicCard";
import MemberScroll from "@/components/dashboard/MemberScroll";
import { Lock, Loader2, Bell, FileText, Wallet, X, ChevronLeft, ChevronRight, Settings, Upload, Save, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    // Data
    const [globalBalance, setGlobalBalance] = useState(0);
    const [members, setMembers] = useState<any[]>([]);
    const [viewDate, setViewDate] = useState(new Date());

    // Fine Data
    const [myMonthlyFine, setMyMonthlyFine] = useState(0);
    const [myFineStatus, setMyFineStatus] = useState("unpaid");
    const [societyFund, setSocietyFund] = useState(0);

    // Settings Data
    const [notice, setNotice] = useState("");
    const [rules, setRules] = useState("");
    const [activeModal, setActiveModal] = useState<string | null>(null);

    // Profile Edit State
    const [editName, setEditName] = useState("");
    const [editFile, setEditFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (!p) {
                const { data } = await supabase.from('profiles').insert({ id: user.id, email: user.email, role: 'user', status: 'pending' }).select().single();
                p = data;
            }
            setProfile(p);
            setEditName(p?.full_name || "");

            if (p?.status === 'active') {
                await fetchGlobalTotalBalance();
                await fetchMonthlyReport(viewDate);
                await fetchSettings();
                await fetchSocietyFund();
            }
            setLoading(false);
        };
        init();

        const channel = supabase.channel('user-dash-final-v4')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => { fetchGlobalTotalBalance(); fetchMonthlyReport(viewDate); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fines' }, () => { fetchMonthlyReport(viewDate); fetchSocietyFund(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'society_expenses' }, () => { fetchSocietyFund(); })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, payload => {
                // If it's ME, update my profile state (Name/Avatar)
                if (payload.new.id === profile?.id) {
                    setProfile(payload.new);
                    setEditName(payload.new.full_name || "");
                }
                // Always refresh the report as names/avatars might have changed for anyone
                fetchMonthlyReport(viewDate);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => { fetchSettings(); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [profile?.id]);

    useEffect(() => { if (profile?.status === 'active') fetchMonthlyReport(viewDate); }, [viewDate]);

    const fetchGlobalTotalBalance = async () => {
        const { data } = await supabase.from('transactions').select('amount').eq('approved', true);
        const sum = data?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
        setGlobalBalance(sum);
    };

    const fetchMonthlyReport = async (date: Date) => {
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

        const { data: allMembers } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
        if (!allMembers) return;

        const { data: monthTxs } = await supabase.from('transactions').select('*').gte('created_at', startOfMonth).lte('created_at', endOfMonth).eq('approved', true);
        const { data: monthFines } = await supabase.from('fines').select('*').eq('month', month).eq('year', year);

        const report = allMembers.map(m => {
            const userTxs = monthTxs?.filter(t => t.user_id === m.id) || [];
            const paidAmount = userTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            const userFineRecord = monthFines?.find(f => f.user_id === m.id);
            const fineAmt = userFineRecord ? userFineRecord.amount : 0;
            const fineSts = userFineRecord ? userFineRecord.status : 'none';

            if (m.id === profile?.id) {
                setMyMonthlyFine(fineAmt);
                setMyFineStatus(fineSts);
            }

            return {
                id: m.id,
                name: m.full_name || m.email.split('@')[0],
                avatar: m.avatar_url,
                paid: paidAmount,
                fineAmount: fineAmt,
                fineStatus: fineSts
            };
        });
        report.sort((a, b) => b.paid - a.paid);
        setMembers(report);
    };

    const fetchSocietyFund = async () => {
        const { data: paid } = await supabase.from('fines').select('amount').eq('status', 'paid');
        const totalCollected = paid?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
        const { data: exp } = await supabase.from('society_expenses').select('amount');
        const totalSpent = exp?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
        setSocietyFund(totalCollected - totalSpent);
    };

    const fetchSettings = async () => {
        const { data } = await supabase.from('settings').select('*');
        if (data) {
            setNotice(data.find((s: any) => s.key_name === 'notice')?.value || "");
            setRules(data.find((s: any) => s.key_name === 'rules')?.value || "");
        }
    };

    const updateProfile = async () => {
        setUploading(true);
        let avatarUrl = profile.avatar_url;

        if (editFile) {
            const fileExt = editFile.name.split('.').pop();
            const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, editFile);

            if (uploadError) {
                toast.error("Upload failed: " + uploadError.message);
                setUploading(false);
                return;
            }

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            avatarUrl = publicUrl;
        }

        // Update Database
        const { error } = await supabase.from('profiles').update({ full_name: editName, avatar_url: avatarUrl }).eq('id', profile.id);

        setUploading(false);
        if (error) toast.error("Error updating profile");
        else {
            // INSTANT UI UPDATE (Optimistic)
            const newProfile = { ...profile, full_name: editName, avatar_url: avatarUrl };
            setProfile(newProfile);

            // Also update the members list optimistically so it reflects immediately
            setMembers(prevMembers => prevMembers.map(m =>
                m.id === profile.id ? { ...m, name: editName, avatar: avatarUrl } : m
            ));

            toast.success("Profile updated!");
            setActiveModal(null);

            // Re-fetch to be safe
            fetchMonthlyReport(viewDate);
        }
    };

    const changeMonth = (dir: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + dir);
        setViewDate(newDate);
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
    if (profile?.status === 'pending') return <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white"><h1 className="text-2xl font-bold">Pending Approval</h1></div>;

    const formattedMonth = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 font-sans overflow-x-hidden">
            <Toaster position="top-right" />
            <Sidebar />
            <main className="lg:ml-72 min-h-screen pb-24 lg:pb-12 border-l border-white/5 bg-black">
                <div className="max-w-6xl mx-auto p-6 md:p-12">

                    {/* HEADER: Dynamic Profile & Settings */}
                    <header className={`flex items-center justify-between mb-8 p-4 rounded-2xl transition-all ${myMonthlyFine > 0 && myFineStatus === 'unpaid' ? 'bg-red-900/10 border border-red-500/30' : ''}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-full border-2 overflow-hidden ${myMonthlyFine > 0 && myFineStatus === 'unpaid' ? 'border-red-500 animate-pulse' : 'border-white/20'}`}>
                                <img src={profile?.avatar_url || "https://i.pravatar.cc/150?u=user"} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                {/* Dynamic Hello */}
                                <p className="text-gray-400">Hello, <span className="text-white font-semibold">{profile?.full_name || "Member"}</span></p>
                                {/* Fixed Welcome Text */}
                                <h1 className="text-2xl font-bold text-white">Welcome unity2020</h1>
                                {myMonthlyFine > 0 && myFineStatus === 'unpaid' && <span className="text-xs text-red-500 font-bold uppercase tracking-wider">Fine Outstanding: {myMonthlyFine} TK</span>}
                            </div>
                        </div>
                        <button onClick={() => setActiveModal('settings')} className="bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-colors text-gray-400 hover:text-white">
                            <Settings size={24} />
                        </button>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-8">
                            <MagicCard balance={globalBalance} fine={profile.fine_amount} />

                            <div className="flex gap-6 my-4">
                                <button onClick={() => setActiveModal('notice')} className="flex flex-col items-center gap-2 group cursor-pointer">
                                    <div className="bg-[#E9D5FF] w-16 h-16 rounded-[20px] flex items-center justify-center transition-transform group-hover:scale-110"><Bell className="text-purple-600" size={24} /></div>
                                    <span className="text-sm text-gray-400 font-medium">Notice</span>
                                </button>
                                <button onClick={() => setActiveModal('rules')} className="flex flex-col items-center gap-2 group cursor-pointer">
                                    <div className="bg-[#BBF7D0] w-16 h-16 rounded-[20px] flex items-center justify-center transition-transform group-hover:scale-110"><FileText className="text-green-600" size={24} /></div>
                                    <span className="text-sm text-gray-400 font-medium">Rules</span>
                                </button>
                                <button onClick={() => setActiveModal('fine')} className="flex flex-col items-center gap-2 group cursor-pointer">
                                    <div className="bg-[#BFDBFE] w-16 h-16 rounded-[20px] flex items-center justify-center transition-transform group-hover:scale-110"><Wallet className="text-blue-600" size={24} /></div>
                                    <span className="text-sm text-gray-400 font-medium">My Fine</span>
                                </button>
                            </div>
                            <MemberScroll />
                        </div>

                        <div className="w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-white">Monthly Report</h2>
                                <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-full">
                                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white/10 rounded-full"><ChevronLeft size={16} /></button>
                                    <span className="text-sm font-bold min-w-[100px] text-center">{formattedMonth}</span>
                                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white/10 rounded-full"><ChevronRight size={16} /></button>
                                </div>
                            </div>

                            <div className="space-y-3 bg-[#111] p-4 rounded-3xl border border-white/5 min-h-[300px] max-h-[500px] overflow-y-auto custom-scrollbar">
                                {members.map((m, i) => (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} key={m.id} className="flex justify-between items-center bg-black/40 border border-white/5 p-3 rounded-2xl hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-10 h-10 rounded-full bg-gray-700 object-cover" />
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium text-sm">{m.name}</span>
                                                {m.fineAmount > 0 && (
                                                    <span className={`text-[10px] font-bold uppercase ${m.fineStatus === 'paid' ? 'text-green-500 line-through' : 'text-red-500'}`}>
                                                        Fine: {m.fineAmount} {m.fineStatus === 'paid' ? '(Paid)' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-sm font-bold ${m.paid > 0 ? 'text-green-500' : 'text-gray-600'}`}>{m.paid > 0 ? `Paid: ${m.paid}` : 'No Payment'}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <BottomNav />

            {/* MODALS */}
            <AnimatePresence>
                {activeModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#1A1A1A] w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl">
                            <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X size={24} /></button>

                            {activeModal === 'notice' && (<div className="bg-white/5 p-4 rounded-xl text-gray-300 whitespace-pre-wrap">{notice || <span className="italic text-gray-500">No notice.</span>}</div>)}
                            {activeModal === 'rules' && (<div className="bg-white/5 p-4 rounded-xl text-gray-300 whitespace-pre-wrap">{rules || <span className="italic text-gray-500">No rules.</span>}</div>)}

                            {activeModal === 'fine' && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-2 text-center text-blue-400">Fine Details</h2>
                                    <p className="text-gray-500 text-center text-sm mb-6">For {formattedMonth}</p>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                                            <span className="text-gray-400 text-xs uppercase block mb-1">My Fine</span>
                                            {myMonthlyFine > 0 ? (
                                                <>
                                                    <span className={`text-2xl font-bold block ${myFineStatus === 'paid' ? 'text-green-500' : 'text-red-500'}`}>{myMonthlyFine}</span>
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${myFineStatus === 'paid' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{myFineStatus}</span>
                                                </>
                                            ) : (<span className="text-green-500 font-bold">Clear</span>)}
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                                            <span className="text-gray-400 text-xs uppercase block mb-1">Society Fund</span>
                                            <span className={`text-2xl font-bold block ${societyFund >= 0 ? 'text-green-400' : 'text-red-400'}`}>{societyFund}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SETTINGS MODAL */}
                            {activeModal === 'settings' && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2"><Settings className="text-gray-400" /> Edit Profile</h2>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Display Name</label>
                                            <div className="flex items-center gap-2 bg-black border border-white/20 p-3 rounded-xl focus-within:border-white/50">
                                                <User size={18} className="text-gray-500" />
                                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="bg-transparent outline-none w-full text-white placeholder-gray-600" placeholder="Enter full name" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Profile Image</label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-full overflow-hidden bg-white/5 border border-white/10">
                                                    {editFile ? (
                                                        <img src={URL.createObjectURL(editFile)} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <img src={profile?.avatar_url || "https://i.pravatar.cc/150?u=user"} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <label className="flex-1 cursor-pointer">
                                                    <div className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                                                        <Upload size={18} />
                                                        <span className="text-sm font-medium">Choose File</span>
                                                    </div>
                                                    <input type="file" className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) setEditFile(e.target.files[0]); }} />
                                                </label>
                                            </div>
                                        </div>

                                        <button onClick={updateProfile} disabled={uploading} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
                                            {uploading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                            {uploading ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
